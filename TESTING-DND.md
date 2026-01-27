# Drag-and-Drop Testing Guide

## 🎯 What Was Fixed

### Root Cause
- **970px** uses Desktop Sidebar (from `layout.tsx`)
- Previous `DndContext` was only in `projects-content.tsx`
- Sidebar's `DroppableFolderTree` was outside the DndContext
- Result: Folder drop zones couldn't register

### Solution Applied
- **Moved DndContext to layout level** via `ProjectDndProvider`
- All sidebars now share the same DndContext
- Projects page **registers handlers** instead of providing context
- Architecture: Oracle-recommended pattern

---

## 📋 Testing Checklist

### Test Environment Setup
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to: `http://localhost:7847/projects`
4. **DO NOT close DevTools during testing**

---

## 🧪 Test 1: 970px Width (The Problem Case)

### Setup
- Browser window width: **970px** (or use DevTools responsive mode)
- Should see: Desktop sidebar on left (always visible)

### Steps
1. **Refresh page** (Ctrl+R)
2. **Check Console** - Should see:
   ```
   🔵 Droppable registered: folder-drop-xxx {name: '아야'}
   🔵 Droppable registered: folder-drop-xxx {name: '허니츄러스'}
   🔵 Root droppable registered: folder-drop-root
   ```
3. Click **"Folders"** button in left sidebar
4. **Drag a project card** onto a folder
5. **Watch Console** - Should see:
   ```
   Drag started: {projectId: 'xxx', projectTitle: 'xxx'}
   🎯 Dragging over: {id: 'folder-drop-xxx', ...}  ← KEY!
   ✅ Folder collision detected: folder-drop-xxx
   📁 Dropping on folder: {targetFolderId: 'xxx', ...}
   ```

### ✅ Success Criteria
- [ ] Folders show **blue ring** on hover during drag
- [ ] Console shows `folder-drop-xxx` (NOT just `project-xxx`)
- [ ] Project moves to folder on drop
- [ ] Toast notification: "1 project moved"

### ❌ Failure Indicators
- Console only shows `project-xxx` IDs (never `folder-drop-xxx`)
- No blue ring on folders during drag
- Drop doesn't move project to folder

---

## 🧪 Test 2: Mobile Width (< 768px)

### Setup
- Browser width: **375px** (iPhone size)
- Should see: Hamburger menu, no sidebar

### Steps
1. **Refresh page**
2. Tap **folder icon** (top left)
3. Sheet slides in from left
4. **Check Console** for droppable registration
5. **Drag project** onto folder in sheet
6. **Verify** project moves and toast appears

### ✅ Success Criteria
- [ ] Sheet opens smoothly
- [ ] Folders register in console
- [ ] Drag-to-folder works in sheet
- [ ] Sheet closes after drop (optional)

---

## 🧪 Test 3: 4K Width (>= 1920px)

### Setup
- Browser width: **1920px or larger**
- Should see: Inline folder sidebar on right side of projects page

### Steps
1. **Refresh page**
2. **Check Console** for droppable registration
3. **Drag project** onto folder in right sidebar
4. **Verify** project moves

### ✅ Success Criteria
- [ ] Right sidebar always visible
- [ ] Drag works same as other sizes
- [ ] No duplicate droppable registrations

---

## 🧪 Test 4: Cross-Page Navigation

### Setup
- Start on `/projects` page at 970px

### Steps
1. **Drag starts working** (verified in Test 1)
2. Navigate to `/dashboard` page
3. Navigate back to `/projects`
4. **Drag again** - should still work

### ✅ Success Criteria
- [ ] Handlers re-register on return to projects page
- [ ] No memory leaks (check DevTools Memory tab if needed)
- [ ] Drag works immediately without refresh

---

## 🧪 Test 5: Root Folder Drop

### Steps
1. **Drag project** from a folder
2. **Drop on "All Projects"** (root)
3. **Verify** project moves to root (no folder)

### ✅ Success Criteria
- [ ] "All Projects" shows blue ring on hover
- [ ] Console shows `folder-drop-root`
- [ ] Project appears in root view

---

## 🐛 Common Issues & Solutions

### Issue: No folder IDs in console
**Symptom**: Only see `project-xxx`, never `folder-drop-xxx`

**Check**:
1. Did you refresh after code changes?
2. Is sidebar visible at your screen width?
3. Are you dragging **over** the folder name/area?

**Solution**: Try dragging slower, ensure cursor is directly over folder

---

### Issue: Droppables register multiple times
**Symptom**: Same folder registered 4+ times in console

**Reason**: Multiple `DroppableFolderTree` instances rendering
- Desktop sidebar
- Mobile sheet
- Projects page sidebar (4K)

**Expected**: Each should register once. Duplicates are OK if using multiple sidebars simultaneously.

---

### Issue: Blue ring doesn't appear
**Symptom**: Folders don't highlight during drag

**Check**:
1. Console shows `folder-drop-xxx` during drag?
2. CSS class applied: `ring-2 ring-primary bg-primary/10`?

**Debug**: Check browser DevTools Elements tab while dragging

---

## 📊 Expected Console Output (970px)

```
🔵 Droppable registered: folder-drop-mkw1z3evvvzjhik7v9i {name: '아야'}
🔵 Droppable registered: folder-drop-mkw4a9t68drb21ch9u6 {name: '허니츄러스'}
🔵 Root droppable registered: folder-drop-root

[User drags project]

Drag started: {projectId: 'mkpf17316xcpa2xgtr8', projectTitle: '[25.12.06] 1부 캐롤 위주 노래방송 !'}
🎯 Dragging over: {id: 'folder-drop-mkw1z3evvvzjhik7v9i', data: {type: 'folder', folderId: 'mkw1z3evvvzjhik7v9i'}, rect: {...}}
✅ Folder collision detected: folder-drop-mkw1z3evvvzjhik7v9i
🎬 Drag ended: {activeId: 'project-mkpf17316xcpa2xgtr8', overId: 'folder-drop-mkw1z3evvvzjhik7v9i', overData: {...}}
📁 Dropping on folder: {targetFolderId: 'mkw1z3evvvzjhik7v9i', isRoot: false}
```

---

## 🎓 Architecture Overview

```
DashboardLayout (layout.tsx)
└─ ProjectDndProvider ← Single DndContext for ALL droppables
   ├─ Desktop Sidebar (768-1919px)
   │  └─ SidebarWithFolders
   │     └─ DroppableFolderTree ✅
   │
   ├─ Mobile Sheet (< 768px)
   │  └─ SidebarWithFolders
   │     └─ DroppableFolderTree ✅
   │
   └─ children (projects page)
      ├─ Projects Sidebar (>= 1920px)
      │  └─ DroppableFolderTree ✅
      │
      └─ Handler Registration
         ├─ onDragStart
         ├─ onDragOver
         └─ onDragEnd
```

**Key Points**:
- **One DndContext** at layout level
- **Multiple DroppableFolderTrees** at different breakpoints
- **Handlers registered** by projects page when mounted
- **Handlers unregistered** when leaving projects page

---

## 📝 Report Format

When reporting results, please provide:

1. **Screen width tested**: ___px
2. **Browser**: Chrome / Edge / Firefox / Safari
3. **Test results**: ✅ or ❌ for each test
4. **Console logs**: Copy/paste relevant lines
5. **Screenshots**: If possible, show:
   - Console during drag
   - Folder with blue ring
   - Any errors

---

## 🚀 Next Steps After Testing

### If ALL tests pass:
- [ ] Remove debug console.logs
- [ ] Git commit cleanup
- [ ] Mark feature as complete

### If ANY test fails:
- [ ] Copy full console output
- [ ] Describe exact steps to reproduce
- [ ] Note screen width and browser
- [ ] Wait for fix before cleanup

---

**Created**: 2026-01-28
**Last Updated**: 2026-01-28
**Version**: 1.0
