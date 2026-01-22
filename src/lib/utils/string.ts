export function sanitizeFilename(name: string): string {
  // Replace invalid characters with underscore
  // Windows invalid characters: < > : " / \ | ? *
  // Linux/macOS invalid characters: / (and sometimes leading/trailing spaces, . )
  // Also remove characters that might cause issues in URLs or scripts (% and #)
  let sanitized = name.replace(/[<>:"/\\|?*%\#]/g, '_');
  
  // Replace spaces with underscores
  sanitized = sanitized.replace(/\s+/g, '_');
  
  // Remove leading/trailing underscores and dots
  sanitized = sanitized.replace(/^[._]+|[._]+$/g, '');
  
  // Limit length to avoid filesystem issues
  sanitized = sanitized.substring(0, 100); 
  
  return sanitized;
}