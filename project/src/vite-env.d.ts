/// <reference types="vite/client" />

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemDirectoryHandle {
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<'granted' | 'denied' | 'prompt'>;
}

interface Window {
  showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
}
