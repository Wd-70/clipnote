"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  ClipboardDocumentIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChatBubbleLeftIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import DualVideoPlayer from "@/components/video/DualVideoPlayer";
import { formatSeconds, formatOffset, parseTimeToSeconds } from "@/lib/timeUtils";
import { useSyncProgress } from "@/hooks/useSyncProgress";
import SyncProgressModal from "@/components/admin/SyncProgressModal";
import StatisticsPanel from "@/components/admin/StatisticsPanel";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { transformError } from "@/lib/errorTransformer";
import { retryWithBackoff, isRetryableError } from "@/lib/retryUtils";
import { VideoCardSkeleton, VideoDetailsSkeleton } from "@/components/admin/SkeletonLoader";
import { LoadingButton } from "@/components/admin/LoadingButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { DebouncedInput } from "@/components/admin/DebouncedInput";
import { SSEConnectionStatus } from "@/components/admin/SSEConnectionStatus";
import OffsetStatusBadge from '@/components/admin/OffsetStatusBadge';
import ManualResetButton from '@/components/admin/ManualResetButton';
import { AccessiblePagination } from '@/components/admin/AccessiblePagination';
import { LiveRegionAnnouncer } from '@/components/admin/LiveRegionAnnouncer';

const AYAUKE_CHANNEL_ID = "abe8aa82baf3d3ef54ad8468ee73e7fc";

interface ChzzkVideo {
  _id: string;
  videoNo: number;
  videoId: string;
  videoTitle: string;
  thumbnailImageUrl: string;
  publishDate: string;
  duration: number;
  readCount: number;
  totalComments: number;
  timelineComments: number;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  timeOffset?: number;
  isDeleted: boolean;
}

interface ChzzkComment {
  _id: string;
  commentId: number;
  videoNo: number;
  content: string;
  authorName: string;
  publishedAt: string;
  isTimeline: boolean;
  extractedTimestamps: string[];
}

interface SyncStats {
  totalVideos: number;
  newVideos: number;
  totalComments: number;
  timelineComments: number;
}

export default function ChzzkYoutubeConverterTab() {
  // Video list state
  const [videos, setVideos] = useState<ChzzkVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<ChzzkVideo | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Video details state
  const [comments, setComments] = useState<ChzzkComment[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [timeOffset, setTimeOffset] = useState<number | null>(null);
  const [videoExists, setVideoExists] = useState(true);

  // Comment display mode
  // Initialize from localStorage, default to false
  const [showConverted, setShowConverted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chzzk-converter-show-converted');
      return saved === 'true';
    }
    return false;
  });
  const [showAllComments, setShowAllComments] = useState(false); // false = timeline only, true = all comments

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [isResettingOffset, setIsResettingOffset] = useState(false);

  // Accessibility: Live region announcements
  const [loadingAnnouncement, setLoadingAnnouncement] = useState('');
  const [syncAnnouncement, setSyncAnnouncement] = useState('');

  // Progress tracking
  const { progress, finalStats, startSync, cancelSync } = useSyncProgress();

  // SSE connection status
  const [sseStatus, setSSEStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');

  // Toast and Confirm hooks
  const { showSuccess, showError: showErrorToast } = useToast();
  const { confirm } = useConfirm();

  // Request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // YouTube URL validation helper
  const isValidYoutubeUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return true; // Allow empty URLs (for clearing mappings)

    const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)([^&\s?]+)/;
    return youtubeRegex.test(url);
  };

  // Save showConverted preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chzzk-converter-show-converted', showConverted.toString());
    }
  }, [showConverted]);

  // Debounce search query to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load videos on mount and when debounced search or pagination changes
  useEffect(() => {
    loadVideos();
  }, [pagination.currentPage, debouncedSearchQuery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingAnnouncement('영상 목록을 불러오는 중입니다');

      const result = await retryWithBackoff(
        async () => {
          const response = await fetch(
            `/api/chzzk-sync?action=list-videos&page=${pagination.currentPage}&limit=20&search=${encodeURIComponent(debouncedSearchQuery)}`
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          return response.json();
        },
        {
          maxRetries: 2,
          shouldRetry: isRetryableError
        }
      );

      if (result.success) {
        setVideos(result.data.videos);
        setPagination(result.data.pagination);
        setLoadingAnnouncement(
          `영상 ${result.data.pagination.totalCount}개를 불러왔습니다. 현재 페이지 ${result.data.pagination.currentPage}`
        );
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      const friendlyError = transformError(err);
      setError(friendlyError);
      showErrorToast('영상 불러오기 실패', friendlyError);
      setLoadingAnnouncement('영상 불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncChannel = async (forceSync: boolean = false) => {
    const confirmed = await confirm({
      title: forceSync ? '강제 재수집' : '채널 수집',
      message: forceSync
        ? '⚠️ 모든 영상과 댓글을 강제로 다시 수집합니다. 기존 데이터가 덮어씌워집니다.\n시간이 오래 걸릴 수 있습니다. 계속하시겠습니까?'
        : '채널의 모든 영상과 댓글을 수집합니다. 시간이 오래 걸릴 수 있습니다. 계속하시겠습니까?',
      confirmText: forceSync ? '강제 수집 시작' : '수집 시작',
      cancelText: '취소',
      type: 'warning'
    });

    if (!confirmed) return;

    setShowProgressModal(true);
    setSSEStatus('connecting');

    try {
      await startSync(forceSync);
      setSSEStatus('connected');
    } catch (error) {
      setSSEStatus('error');
      const friendlyError = transformError(error);
      showErrorToast('동기화 실패', friendlyError);
    }
  };

  // Handle sync completion
  useEffect(() => {
    if (progress.stage === 'complete' && finalStats) {
      loadVideos();
      setSyncAnnouncement(
        `동기화 완료: 총 ${finalStats.totalVideos}개 영상 처리, ${finalStats.timelineComments}개 타임라인 댓글 발견`
      );

      // Optional: Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Sync Complete', {
          body: `Processed ${finalStats.totalVideos} videos, found ${finalStats.timelineComments} timeline comments`,
        });
      }
    } else if (progress.stage === 'videos') {
      setSyncAnnouncement(`영상 수집 중: ${progress.current}/${progress.total}`);
    } else if (progress.stage === 'comments') {
      setSyncAnnouncement(`댓글 수집 중: ${progress.current}/${progress.total}`);
    }
  }, [progress.stage, finalStats, progress.current, progress.total]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleSelectVideo = async (video: ChzzkVideo) => {
    // Cancel previous request
    abortControllerRef.current?.abort();

    // Create new controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSelectedVideo(video);
    setYoutubeUrl(video.youtubeUrl || "");
    setTimeOffset(video.timeOffset !== undefined ? video.timeOffset : null);
    setShowConverted(false);

    // Load comments
    try {
      setLoadingDetails(true);
      const response = await fetch(
        `/api/chzzk-sync?action=get-video&videoNo=${video.videoNo}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setComments(result.data.comments);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }
      const friendlyError = transformError(err);
      showErrorToast('댓글 불러오기 실패', friendlyError);
    } finally {
      setLoadingDetails(false);
    }

    // Check video status (non-critical, don't show errors)
    checkVideoStatus(video.videoNo);
  };

  const checkVideoStatus = async (videoNo: number) => {
    try {
      const response = await fetch("/api/chzzk-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-video-status", videoNo }),
      });

      const result = await response.json();
      if (result.success) {
        setVideoExists(result.data.exists);
      }
    } catch (err: any) {
      console.error("Error checking video status:", err);
    }
  };

  const handleStatisticsVideoSelect = async (videoNo: number) => {
    const video = videos.find(v => v.videoNo === videoNo);
    if (video) {
      await handleSelectVideo(video);
    } else {
      // Load video if not in current list
      try {
        setLoading(true);
        const response = await fetch(`/api/chzzk-sync?action=get-video&videoNo=${videoNo}`);
        const result = await response.json();
        if (result.success) {
          await handleSelectVideo(result.data.video);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveYoutubeUrl = async () => {
    if (!selectedVideo) return;

    // VALIDATION: Check YouTube URL format before saving
    if (!isValidYoutubeUrl(youtubeUrl)) {
      setError('올바른 유튜브 URL을 입력하세요.\n예: https://www.youtube.com/watch?v=VIDEO_ID');
      return;
    }

    // Clear any existing errors
    setError(null);

    // DETECT URL CHANGE: Check if user is modifying existing URL with offset
    const isUrlChange = selectedVideo.youtubeUrl && youtubeUrl && selectedVideo.youtubeUrl !== youtubeUrl;
    const hasExistingOffset = selectedVideo.timeOffset !== null && selectedVideo.timeOffset !== undefined;

    // WARN on URL change with existing offset
    if (isUrlChange && hasExistingOffset) {
      const confirmed = await confirm({
        title: '유튜브 URL 변경',
        message: `기존에 설정된 오프셋 (${formatOffset(selectedVideo.timeOffset)})이 있습니다.\nURL을 변경하면 오프셋이 초기화됩니다. 계속하시겠습니까?`,
        confirmText: '변경 및 초기화',
        cancelText: '취소',
        type: 'warning'
      });

      if (!confirmed) return;
    }

    // Store original values for rollback
    const originalYoutubeUrl = selectedVideo.youtubeUrl;
    const originalTimeOffset = selectedVideo.timeOffset;

    // Optimistic update
    const optimisticVideo = { ...selectedVideo, youtubeUrl };
    setSelectedVideo(optimisticVideo);
    setVideos(videos.map(v => v.videoNo === selectedVideo.videoNo ? optimisticVideo : v));

    try {
      setIsSaving(true);
      const response = await fetch('/api/chzzk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-video',
          videoNo: selectedVideo.videoNo,
          youtubeUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Confirm with server data
        setSelectedVideo(result.data.video);
        setVideos(videos.map(v => v.videoNo === selectedVideo.videoNo ? result.data.video : v));
        setTimeOffset(result.data.video.timeOffset ?? null);

        // Show appropriate success message
        if (result.data.offsetCleared) {
          showSuccess('저장 완료', '유튜브 URL이 제거되었고 오프셋이 초기화되었습니다.');
          setShowConverted(false); // Disable converted view
        } else if (isUrlChange && hasExistingOffset) {
          showSuccess('저장 완료', 'URL이 변경되었고 오프셋이 초기화되었습니다.');
          setShowConverted(false);
        } else {
          showSuccess('저장 완료', '유튜브 URL이 저장되었습니다.');
        }
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      // Rollback on error
      const rolledBackVideo = {
        ...selectedVideo,
        youtubeUrl: originalYoutubeUrl,
        timeOffset: originalTimeOffset
      };
      setSelectedVideo(rolledBackVideo);
      setVideos(videos.map(v => v.videoNo === selectedVideo.videoNo ? rolledBackVideo : v));
      setTimeOffset(originalTimeOffset ?? null);

      const friendlyError = transformError(err);
      showErrorToast('저장 실패', friendlyError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetOffset = async () => {
    if (!selectedVideo) return;

    try {
      setIsResettingOffset(true);
      const response = await fetch('/api/chzzk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-video',
          videoNo: selectedVideo.videoNo,
          timeOffset: null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setSelectedVideo(result.data.video);
        setVideos(videos.map(v => v.videoNo === selectedVideo.videoNo ? result.data.video : v));
        setTimeOffset(null);
        setShowConverted(false);
        showSuccess('초기화 완료', '오프셋이 초기화되었습니다.');
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      const friendlyError = transformError(err);
      showErrorToast('초기화 실패', friendlyError);
    } finally {
      setIsResettingOffset(false);
    }
  };

  const convertCommentTimestamps = (comment: ChzzkComment): string => {
    if (!timeOffset) return comment.content;

    // Split by lines and process each line individually
    const lines = comment.content.split('\n');

    const convertedLines = lines.map(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return line;

      // Match timestamp at the start of the line: H:MM:SS or MM:SS
      // Priority: HH:MM:SS first, then MM:SS
      const timePatternHMS = /^(\d{1,2}:\d{2}:\d{2})/;
      const timePatternMS = /^(\d{1,2}:\d{2})/;

      let match = trimmedLine.match(timePatternHMS);
      if (!match) {
        match = trimmedLine.match(timePatternMS);
      }

      if (match) {
        const originalTime = match[1];
        const seconds = parseTimeToSeconds(originalTime);
        const newSeconds = seconds + timeOffset;
        const newTimestamp = formatSeconds(newSeconds);

        return trimmedLine.replace(originalTime, newTimestamp);
      }

      return trimmedLine;
    });

    return convertedLines.join('\n');
  };

  // Organize comments into hierarchical structure
  const organizedComments = useMemo(() => {
    // Filter comments based on toggle
    const filteredComments = showAllComments
      ? comments
      : comments.filter(c => c.isTimeline);

    // Separate parent comments and replies
    const parentComments = filteredComments.filter(c => !c.parentCommentId || c.parentCommentId === 0);
    const replies = filteredComments.filter(c => c.parentCommentId && c.parentCommentId !== 0);

    // Build hierarchical structure
    const result: any[] = [];

    parentComments.forEach(parent => {
      // Add parent comment
      const displayContent = (showConverted && timeOffset !== null)
        ? convertCommentTimestamps(parent)
        : parent.content;

      result.push({
        ...parent,
        displayContent,
        isReply: false
      });

      // Add its replies
      const childReplies = replies.filter(r => r.parentCommentId === parent.commentId);
      childReplies.forEach(reply => {
        const replyDisplayContent = (showConverted && timeOffset !== null)
          ? convertCommentTimestamps(reply)
          : reply.content;

        result.push({
          ...reply,
          displayContent: replyDisplayContent,
          isReply: true
        });
      });
    });

    return result;
  }, [comments, showConverted, timeOffset, showAllComments]);

  const displayedComments = organizedComments;

  const handleCopyComments = () => {
    const text = displayedComments
      .map(c => {
        const indent = c.isReply ? '  ↳ ' : '';
        return `${indent}${c.authorName}: ${c.displayContent}`;
      })
      .join("\n");
    navigator.clipboard.writeText(text);
    showSuccess('복사 완료', '댓글이 클립보드에 복사되었습니다.');
  };

  const statsText = useMemo(() => {
    const totalVideos = pagination.totalCount;
    const mappedVideos = videos.filter(v => v.youtubeUrl).length;
    const totalTimeline = videos.reduce((sum, v) => sum + v.timelineComments, 0);

    return `총 ${totalVideos}개 영상, 타임라인 댓글 ${totalTimeline}개, 매핑 완료 ${mappedVideos}개`;
  }, [videos, pagination.totalCount]);

  return (
    <div className="space-y-6">
      {/* Live region announcers */}
      <LiveRegionAnnouncer message={loadingAnnouncement} politeness="polite" />
      <LiveRegionAnnouncer message={syncAnnouncement} politeness="assertive" />
      <LiveRegionAnnouncer message={error || ''} politeness="assertive" />

      {/* Header */}
      <header className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 border border-light-primary/20 dark:border-dark-primary/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-light-text dark:text-dark-text mb-2">
              치지직→유튜브 타임라인 변환
            </h1>
            <p className="text-light-text/60 dark:text-dark-text/60 text-sm">
              {statsText}
            </p>
            {progress.isActive && (
              <div className="mt-2">
                <SSEConnectionStatus status={sseStatus} />
              </div>
            )}
          </div>
          <div className="flex gap-2" role="group" aria-label="도구 모음">
            <LoadingButton
              onClick={() => setShowStatistics(!showStatistics)}
              variant="primary"
            >
              {showStatistics ? '통계 숨기기' : '통계 보기'}
            </LoadingButton>
            <LoadingButton
              onClick={() => handleSyncChannel(false)}
              isLoading={progress.isActive}
              variant="accent"
              icon={<ArrowPathIcon className="w-5 h-5" />}
              aria-label="치지직 채널 영상 및 댓글 수집"
            >
              {progress.isActive ? "수집 중..." : "채널 수집"}
            </LoadingButton>
            <LoadingButton
              onClick={() => handleSyncChannel(true)}
              isLoading={progress.isActive}
              variant="primary"
              icon={<ArrowPathIcon className="w-5 h-5" />}
              aria-label="강제 재수집 (기존 데이터 덮어쓰기)"
              title="모든 영상과 댓글을 다시 수집하여 기존 데이터를 업데이트합니다"
            >
              {progress.isActive ? "수집 중..." : "강제 재수집"}
            </LoadingButton>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <motion.div
          role="alert"
          aria-live="assertive"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 flex items-start gap-3"
        >
          <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
              오류가 발생했습니다
            </h2>
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          </div>
          <button
            onClick={() => setError(null)}
            aria-label="오류 메시지 닫기"
            className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-800/30 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-light-purple dark:focus-visible:outline-dark-accent"
          >
            <XMarkIcon className="w-4 h-4 text-red-500" aria-hidden="true" />
          </button>
        </motion.div>
      )}

      {/* Statistics Dashboard */}
      {showStatistics && (
        <StatisticsPanel onVideoSelect={handleStatisticsVideoSelect} />
      )}

      {/* Main Content */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Video List */}
        <aside
          className="lg:col-span-1 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm rounded-xl border border-light-primary/20 dark:border-dark-primary/20 overflow-hidden"
          aria-label="영상 목록"
        >
          {/* Search */}
          <div className="p-4 border-b border-light-primary/20 dark:border-dark-primary/20">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text/40 dark:text-dark-text/40 pointer-events-none z-10" aria-hidden="true" />
              <DebouncedInput
                type="text"
                placeholder="영상 검색..."
                value={searchQuery}
                onChange={setSearchQuery}
                debounceMs={300}
                isLoading={loading}
                showClearButton={true}
                aria-label="영상 제목 검색"
                className="w-full pl-10 pr-10 py-2 bg-white/50 dark:bg-gray-800/50 border border-light-primary/20 dark:border-dark-primary/20 rounded-lg text-light-text dark:text-dark-text placeholder:text-light-text/40 dark:placeholder:text-dark-text/40 focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
              />
            </div>
          </div>

          {/* Video List */}
          <div
            className="overflow-y-auto max-h-[600px]"
            role="list"
            aria-label="영상 목록"
            aria-busy={loading}
          >
            {loading && videos.length === 0 ? (
              <div className="divide-y divide-light-primary/10 dark:divide-dark-primary/10">
                {Array.from({ length: 5 }).map((_, i) => (
                  <VideoCardSkeleton key={i} />
                ))}
              </div>
            ) : videos.length === 0 ? (
              <EmptyState
                icon={<PlayIcon className="w-16 h-16" />}
                title="영상이 없습니다"
                message="채널 수집 버튼을 눌러 영상을 가져오세요."
              />
            ) : (
              <div className="divide-y divide-light-primary/10 dark:divide-dark-primary/10">
                {videos.map((video) => (
                  <button
                    key={video.videoNo}
                    onClick={() => handleSelectVideo(video)}
                    aria-label={`${video.videoTitle}, 타임라인 댓글 ${video.timelineComments}개, ${
                      video.youtubeUrl ? '유튜브 매핑 완료' : '유튜브 매핑 필요'
                    }`}
                    aria-current={selectedVideo?.videoNo === video.videoNo ? 'true' : undefined}
                    className={`w-full p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-light-purple dark:focus-visible:outline-dark-accent ${
                      selectedVideo?.videoNo === video.videoNo
                        ? "bg-light-accent/20 dark:bg-dark-accent/20 border-l-2 border-light-accent dark:border-dark-accent"
                        : "hover:bg-white/30 dark:hover:bg-gray-800/30"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="relative w-32 h-18 flex-shrink-0 rounded-lg overflow-hidden">
                        <Image
                          src={video.thumbnailImageUrl}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-light-text dark:text-dark-text mb-1 line-clamp-2">
                          {video.videoTitle}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-light-text/60 dark:text-dark-text/60">
                          <span>타임라인 {video.timelineComments}개</span>
                          {video.youtubeUrl ? (
                            <CheckCircleIcon className="w-4 h-4 text-green-500" aria-hidden="true" />
                          ) : (
                            <XCircleIcon className="w-4 h-4 text-gray-400" aria-hidden="true" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <AccessiblePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setPagination({ ...pagination, currentPage: page })}
            />
          )}
        </aside>

        {/* Right Panel: Details */}
        <article
          className="lg:col-span-2 space-y-6"
          aria-label="선택된 영상 상세 정보"
        >
          {!selectedVideo ? (
            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm rounded-xl p-12 border border-light-primary/20 dark:border-dark-primary/20 text-center">
              <p className="text-light-text/60 dark:text-dark-text/60">
                ← 왼쪽에서 영상을 선택하세요
              </p>
            </div>
          ) : loadingDetails ? (
            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm rounded-xl border border-light-primary/20 dark:border-dark-primary/20">
              <VideoDetailsSkeleton />
            </div>
          ) : (
            <>
              {/* Video Info */}
              <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 border border-light-primary/20 dark:border-dark-primary/20">
                <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4">
                  {selectedVideo.videoTitle}
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-light-text/60 dark:text-dark-text/60">게시일:</span>{" "}
                    <span className="text-light-text dark:text-dark-text">
                      {new Date(selectedVideo.publishDate).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <div>
                    <span className="text-light-text/60 dark:text-dark-text/60">길이:</span>{" "}
                    <span className="text-light-text dark:text-dark-text">
                      {formatSeconds(selectedVideo.duration)}
                    </span>
                  </div>
                  <div>
                    <span className="text-light-text/60 dark:text-dark-text/60">전체 댓글:</span>{" "}
                    <span className="text-light-text dark:text-dark-text">
                      {selectedVideo.totalComments}개
                    </span>
                  </div>
                  <div>
                    <span className="text-light-text/60 dark:text-dark-text/60">타임라인 댓글:</span>{" "}
                    <span className="text-light-text dark:text-dark-text">
                      {selectedVideo.timelineComments}개
                    </span>
                  </div>
                </div>
              </div>

              {/* YouTube URL */}
              <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 border border-light-primary/20 dark:border-dark-primary/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
                    유튜브 URL
                  </h2>
                  {/* Offset Status Badge */}
                  <OffsetStatusBadge
                    timeOffset={timeOffset}
                    syncSetAt={selectedVideo.syncSetAt}
                  />
                </div>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=... 또는 https://youtu.be/..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="flex-1 px-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-light-primary/20 dark:border-dark-primary/20 rounded-lg text-light-text dark:text-dark-text placeholder:text-light-text/40 dark:placeholder:text-dark-text/40 focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                  />
                  <LoadingButton
                    onClick={handleSaveYoutubeUrl}
                    isLoading={isSaving}
                    variant="accent"
                  >
                    저장
                  </LoadingButton>
                </div>

                {/* Manual Reset Button - Only show if offset is set */}
                {timeOffset !== null && timeOffset !== undefined && (
                  <div className="flex justify-end">
                    <ManualResetButton
                      disabled={false}
                      onReset={handleResetOffset}
                      isLoading={isResettingOffset}
                    />
                  </div>
                )}

                {/* Helper text */}
                <p className="text-xs text-light-text/50 dark:text-dark-text/50 mt-2">
                  💡 URL을 제거하면 설정된 오프셋도 자동으로 초기화됩니다.
                </p>
              </div>

              {/* Dual Video Player */}
              {youtubeUrl && selectedVideo && (
                <DualVideoPlayer
                  chzzkVideoUrl={selectedVideo.videoUrl}
                  chzzkVideoNo={selectedVideo.videoNo}
                  chzzkIsDeleted={!videoExists}
                  youtubeUrl={youtubeUrl}
                  currentOffset={timeOffset}
                  onSetSyncPoint={async (chzzkTime, youtubeTime, offset) => {
                    setTimeOffset(offset);

                    try {
                      const response = await fetch("/api/chzzk-sync", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "update-video",
                          videoNo: selectedVideo.videoNo,
                          timeOffset: offset,
                        }),
                      });

                      const result = await response.json();

                      if (result.success) {
                        const updatedVideo = result.data.video;
                        setSelectedVideo(updatedVideo);

                        // Update videos array to persist the change
                        setVideos(prevVideos =>
                          prevVideos.map(v =>
                            v.videoNo === updatedVideo.videoNo ? updatedVideo : v
                          )
                        );

                        setShowConverted(true);
                        showSuccess('싱크 포인트 설정 완료', `오프셋: ${formatOffset(offset)}`);
                      } else {
                        throw new Error(result.error);
                      }
                    } catch (err: any) {
                      const friendlyError = transformError(err);
                      showErrorToast('싱크 포인트 설정 실패', friendlyError);
                    }
                  }}
                />
              )}

              {/* Comments */}
              {comments.length > 0 && (
                <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 border border-light-primary/20 dark:border-dark-primary/20">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
                      댓글 ({displayedComments.length}개)
                    </h2>
                    <div className="flex items-center gap-4">
                      {/* Toggle: Timeline only vs All comments */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowAllComments(false)}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            !showAllComments
                              ? 'bg-light-accent dark:bg-dark-accent text-white'
                              : 'bg-white/50 dark:bg-gray-800/50 text-light-text/60 dark:text-dark-text/60 hover:bg-white/70 dark:hover:bg-gray-800/70'
                          }`}
                          aria-pressed={!showAllComments}
                        >
                          타임라인만
                        </button>
                        <button
                          onClick={() => setShowAllComments(true)}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            showAllComments
                              ? 'bg-light-accent dark:bg-dark-accent text-white'
                              : 'bg-white/50 dark:bg-gray-800/50 text-light-text/60 dark:text-dark-text/60 hover:bg-white/70 dark:hover:bg-gray-800/70'
                          }`}
                          aria-pressed={showAllComments}
                        >
                          전체 댓글
                        </button>
                      </div>

                      {/* Convert checkbox */}
                      <label className="flex items-center gap-2 text-sm text-light-text/60 dark:text-dark-text/60">
                        <input
                          type="checkbox"
                          checked={showConverted}
                          onChange={(e) => {
                            setShowConverted(e.target.checked);
                            if (e.target.checked) {
                              setLoadingAnnouncement('타임스탬프 변환 모드 활성화');
                            } else {
                              setLoadingAnnouncement('원본 타임스탬프 모드 활성화');
                            }
                          }}
                          disabled={timeOffset === null}
                          aria-label="유튜브 타임스탬프로 변환하여 보기"
                          aria-describedby="convert-help-text"
                          className="rounded"
                        />
                        변환 보기
                        <span id="convert-help-text" className="sr-only">
                          {timeOffset === null
                            ? '오프셋이 설정되지 않아 변환 기능을 사용할 수 없습니다'
                            : '체크하면 치지직 타임스탬프를 유튜브 타임스탬프로 변환하여 표시합니다'}
                        </span>
                      </label>

                      {/* Copy button */}
                      {displayedComments.length > 0 && (
                        <button
                          onClick={handleCopyComments}
                          aria-label="댓글 복사하기"
                          className="flex items-center gap-2 px-4 py-2 bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent rounded-lg hover:bg-light-accent/20 dark:hover:bg-dark-accent/20 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-light-purple dark:focus-visible:outline-dark-accent"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" aria-hidden="true" />
                          <span>복사</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {displayedComments.length > 0 ? (
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
                      {displayedComments.map((comment) => (
                        <div
                          key={comment.commentId}
                          className={`pb-3 border-b border-light-primary/10 dark:border-dark-primary/10 last:border-b-0 last:pb-0 ${
                            comment.isReply ? 'ml-3' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              {comment.isReply && (
                                <span className="text-xs text-light-text/40 dark:text-dark-text/40">↳</span>
                              )}
                              <span className="text-sm font-semibold text-light-text dark:text-dark-text">
                                {comment.authorName}
                              </span>
                              {comment.isReply && (
                                <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                                  답글
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-light-text/40 dark:text-dark-text/40">
                                {new Date(comment.publishedAt).toLocaleString('ko-KR', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(comment.displayContent);
                                  showSuccess('복사 완료', '댓글이 클립보드에 복사되었습니다.');
                                }}
                                className="p-1 hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 rounded transition-colors"
                                title="이 댓글 복사"
                                aria-label="이 댓글 복사"
                              >
                                <ClipboardDocumentIcon className="w-4 h-4 text-light-text/60 dark:text-dark-text/60 hover:text-light-accent dark:hover:text-dark-accent" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-light-text/80 dark:text-dark-text/80 whitespace-pre-wrap break-words">
                            {comment.displayContent}
                          </p>
                          {comment.isTimeline && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-light-accent/20 dark:bg-dark-accent/20 text-light-accent dark:text-dark-accent rounded">
                              타임라인
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<ChatBubbleLeftIcon className="w-16 h-16" aria-hidden="true" />}
                      title={showAllComments ? "이 영상에는 댓글이 없습니다." : "이 영상에는 타임라인 댓글이 없습니다."}
                      message={showAllComments ? "" : "타임라인 댓글은 '0:00' 같은 시간 표시가 포함된 댓글입니다."}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </article>
      </main>

      {/* Progress Modal */}
      <SyncProgressModal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        progress={progress}
        onCancel={cancelSync}
      />
    </div>
  );
}
