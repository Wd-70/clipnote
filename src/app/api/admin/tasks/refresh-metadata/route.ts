import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getDB } from '@/lib/db/adapter';
import { fetchYouTubeVideoInfo } from '@/lib/utils/youtube';
import { fetchChzzkVideoInfo, fetchChzzkLiveInfo } from '@/lib/utils/chzzk';
import { fetchTwitchVideoInfo } from '@/lib/utils/twitch';

/**
 * POST /api/admin/tasks/refresh-metadata
 *
 * Refreshes video metadata for projects.
 * Body: { mode: 'missing' | 'all' }
 *   - missing: only projects with no channelId
 *   - all: re-fetch all projects
 *
 * Uses Server-Sent Events to stream progress.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const mode = body.mode || 'missing';

    const db = await getDB();
    let projects = await db.Project.find({});

    if (mode === 'missing') {
      projects = projects.filter((p: any) => !p.channelId || !p.thumbnailUrl);
    }

    const total = projects.length;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const results: Array<{
      id: string;
      title: string;
      status: string;
      platform?: string;
      channelName?: string;
      reason?: string;
    }> = [];

    for (const project of projects) {
      try {
        let channelId: string | undefined;
        let channelName: string | undefined;
        let thumbnailUrl: string | undefined;
        let duration: number | undefined;
        let skipReason: string | undefined;

        if (project.platform === 'YOUTUBE') {
          if (!process.env.YOUTUBE_API_KEY) {
            skipReason = 'YOUTUBE_API_KEY not configured';
          } else {
            const info = await fetchYouTubeVideoInfo(project.videoId);
            if (info) {
              channelId = info.channelId;
              channelName = info.channelTitle;
              thumbnailUrl = info.thumbnailUrl;
              duration = info.duration;
              if (!channelId) skipReason = 'API returned empty channelId';
            } else {
              skipReason = 'API returned no data (video not found?)';
            }
          }
        } else if (project.platform === 'CHZZK') {
          if (project.isLive) {
            // Live projects: videoId is channelId, use live API
            const liveId = project.liveChannelId || project.videoId;
            const liveInfo = await fetchChzzkLiveInfo(liveId);
            if (liveInfo) {
              channelId = liveInfo.channelId;
              channelName = liveInfo.channelName;
              thumbnailUrl = liveInfo.thumbnailUrl;
              if (!channelId) skipReason = 'Live API returned empty channelId';
            } else {
              skipReason = 'Chzzk live API returned no data';
            }
          } else {
            const info = await fetchChzzkVideoInfo(project.videoId);
            if (info) {
              channelId = info.channelId;
              channelName = info.channelName;
              thumbnailUrl = info.thumbnailUrl;
              duration = info.duration;
              if (!channelId) skipReason = 'API returned empty channelId';
            } else {
              skipReason = 'Chzzk API returned no data (video not found?)';
            }
          }
        } else if (project.platform === 'TWITCH') {
          if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_ACCESS_TOKEN) {
            skipReason = 'TWITCH credentials not configured';
          } else {
            const info = await fetchTwitchVideoInfo(project.videoId);
            if (info) {
              channelId = info.channelId;
              channelName = info.channelName;
              thumbnailUrl = info.thumbnailUrl;
              duration = info.duration;
              if (!channelId) skipReason = 'API returned empty channelId';
            } else {
              skipReason = 'API returned no data (video not found?)';
            }
          }
        } else {
          skipReason = `Unknown platform: ${project.platform}`;
        }

        if (channelId || (thumbnailUrl && !project.thumbnailUrl)) {
          const setFields: Record<string, any> = {};
          if (channelId) {
            setFields.channelId = channelId;
            setFields.channelName = channelName;
          }
          if (thumbnailUrl && (!project.thumbnailUrl || mode === 'all')) {
            setFields.thumbnailUrl = thumbnailUrl;
          }
          if (duration && !project.duration) {
            setFields.duration = duration;
          }

          if (Object.keys(setFields).length > 0) {
            const updateResult = await db.Project.findByIdAndUpdate(
              project._id,
              { $set: setFields },
              { new: true }
            );
            console.log(`[refresh-metadata] Updated ${project._id}: fields=${Object.keys(setFields).join(',')}`);
            updated++;
            results.push({
              id: String(project._id),
              title: project.title,
              status: 'updated',
              platform: project.platform,
              channelName: channelName || project.channelName,
            });
          } else {
            skipped++;
            results.push({
              id: String(project._id),
              title: project.title,
              status: 'skipped',
              platform: project.platform,
              reason: 'Nothing to update',
            });
          }
        } else {
          skipped++;
          results.push({
            id: String(project._id),
            title: project.title,
            status: 'skipped',
            platform: project.platform,
            reason: skipReason,
          });
        }
      } catch (err) {
        failed++;
        results.push({
          id: String(project._id),
          title: project.title,
          status: 'failed',
          platform: project.platform,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      data: { total, updated, skipped, failed, results },
    });
  } catch (error) {
    console.error('[API admin/tasks/refresh-metadata] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
