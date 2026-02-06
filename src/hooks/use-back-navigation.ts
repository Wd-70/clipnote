'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const BACK_URL_KEY = 'clipnote-editor-back-url';

/**
 * Hook for managing back navigation from editor
 * Stores the current URL when leaving a page, retrieves it in the editor
 */
export function useBackNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Store current location as back URL (call before navigating to editor)
  const storeBackUrl = useCallback(() => {
    try {
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      sessionStorage.setItem(BACK_URL_KEY, currentUrl);
    } catch {
      // sessionStorage not available
    }
  }, [pathname, searchParams]);

  return { storeBackUrl };
}

/**
 * Hook for getting the back URL in the editor
 * Returns the stored back URL or a default fallback
 */
export function useEditorBackUrl(fallback: string = '/projects') {
  const [backUrl, setBackUrl] = useState<string>(fallback);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(BACK_URL_KEY);
      if (stored) {
        setBackUrl(stored);
      }
    } catch {
      // sessionStorage not available
    }
  }, []);

  // Clear the stored URL when leaving the editor
  const clearBackUrl = useCallback(() => {
    try {
      sessionStorage.removeItem(BACK_URL_KEY);
    } catch {
      // sessionStorage not available
    }
  }, []);

  return { backUrl, clearBackUrl };
}
