let currentTab = 0; // as an index
const tabIds = ["uploadTab", "generateTab"];

function showTab(tabIndex) {
    currentTab = tabIndex;
    tabIds.forEach((tab, index) => {
        document.getElementById(tab).style.display = index === tabIndex ? "block" : "none";
    });
}
showTab(currentTab);
window.showTab = showTab;

/* Directory Access System with File System API */

// Global variables for directory handling
let currentDirectoryHandle = null;
let currentDirectoryPath = '';
const RECENT_PATHS_KEY = 'studieasy_recent_paths';
const MAX_RECENT_PATHS = 10;

// Initialize directory system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initDirectorySystem();
});

function initDirectorySystem() {
    const directoryBtn = document.getElementById('directoryBtn');
    const openDirectoryBtn = document.getElementById('openDirectoryBtn');

    // Check if File System API is supported
    const supportsFileSystemAPI = 'showDirectoryPicker' in window;

    if (!supportsFileSystemAPI) {
        console.warn('File System API not supported in this browser');
        updateDirectoryDisplay('File System API not supported');
        return;
    }

    // Event listeners
    if (directoryBtn) {
        directoryBtn.addEventListener('click', handleDirectorySelection);
    }

    if (openDirectoryBtn) {
        openDirectoryBtn.addEventListener('click', handleOpenDirectory);
    }
}

async function handleDirectorySelection() {
    try {
        const directoryHandle = await window.showDirectoryPicker();
        currentDirectoryHandle = directoryHandle;
        currentDirectoryPath = directoryHandle.name;
        
        // Add to recent paths
        addToRecentPaths(currentDirectoryPath);
        
        // Update UI
        updateDirectoryDisplay(currentDirectoryPath);
        
        console.log('Directory selected:', currentDirectoryPath);
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error selecting directory:', error);
            updateDirectoryDisplay('Error selecting directory');
        }
    }
}

function handleOpenDirectory(event) {
    event.preventDefault();
    
    if (!currentDirectoryHandle) {
        alert('Please select a directory first.');
        return;
    }
    
    console.log('Opening directory:', currentDirectoryPath);
    // Here you would typically navigate to a directory view or perform directory operations
    alert(`Directory opened: ${currentDirectoryPath}`);
}

function updateDirectoryDisplay(pathText) {
    const directoryPath = document.getElementById('directoryPath');
    if (directoryPath) {
        directoryPath.textContent = pathText || 'No directory chosen';
    }
}

// Recent paths management
function addToRecentPaths(path) {
    let recentPaths = getRecentPaths();
    
    // Remove if already exists
    recentPaths = recentPaths.filter(p => p !== path);
    
    // Add to beginning
    recentPaths.unshift(path);
    
    // Limit to max items
    if (recentPaths.length > MAX_RECENT_PATHS) {
        recentPaths = recentPaths.slice(0, MAX_RECENT_PATHS);
    }
    
    // Save to localStorage
    localStorage.setItem(RECENT_PATHS_KEY, JSON.stringify(recentPaths));
}

function getRecentPaths() {
    try {
        const stored = localStorage.getItem(RECENT_PATHS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error reading recent paths:', error);
        return [];
    }
}

// Public function for UI to open a specific path
async function openPath(path) {
    try {
        // This is a placeholder since File System API doesn't support opening by path
        // In a real implementation, you'd need to store handles or use a different approach
        console.log('Opening path:', path);
        
        // Add to recent paths
        addToRecentPaths(path);
        
        // Update display
        updateDirectoryDisplay(path);
        
        return true;
    } catch (error) {
        console.error('Error opening path:', error);
        return false;
    }
}

// Get directory listing in a structured format
async function getDirectoryListing(directoryHandle = currentDirectoryHandle, currentPath = '') {
    if (!directoryHandle) {
        throw new Error('No directory handle available');
    }
    
    const listing = {
        path: currentPath,
        files: [],
        directories: []
    };
    
    try {
        for await (const [name, handle] of directoryHandle.entries()) {
            const fullPath = currentPath ? `${currentPath}/${name}` : name;
            
            if (handle.kind === 'file') {
                const file = await handle.getFile();
                listing.files.push({
                    name: name,
                    path: fullPath,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                    handle: handle
                });
            } else if (handle.kind === 'directory') {
                listing.directories.push({
                    name: name,
                    path: fullPath,
                    handle: handle
                });
            }
        }
        
        return listing;
    } catch (error) {
        console.error('Error reading directory:', error);
        throw error;
    }
}

// Read file content in OpenAI API format (base64)
async function readFileAsBase64(filePath, directoryHandle = currentDirectoryHandle) {
    if (!directoryHandle) {
        throw new Error('No directory handle available');
    }
    
    try {
        // Navigate to the file through the directory structure
        const pathParts = filePath.split('/').filter(part => part.length > 0);
        let currentHandle = directoryHandle;
        
        // Navigate through directories
        for (let i = 0; i < pathParts.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
        }
        
        // Get the file
        const fileName = pathParts[pathParts.length - 1];
        const fileHandle = await currentHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        
        // Convert to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        
        return {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            content: base64,
            encoding: 'base64'
        };
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
}

// Alternative function to read file as text (for text files)
async function readFileAsText(filePath, directoryHandle = currentDirectoryHandle) {
    if (!directoryHandle) {
        throw new Error('No directory handle available');
    }
    
    try {
        // Navigate to the file through the directory structure
        const pathParts = filePath.split('/').filter(part => part.length > 0);
        let currentHandle = directoryHandle;
        
        // Navigate through directories
        for (let i = 0; i < pathParts.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
        }
        
        // Get the file
        const fileName = pathParts[pathParts.length - 1];
        const fileHandle = await currentHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        
        // Read as text
        const text = await file.text();
        
        return {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            content: text,
            encoding: 'text'
        };
    } catch (error) {
        console.error('Error reading file as text:', error);
        throw error;
    }
}

// Expose functions globally for UI use
window.openPath = openPath;
window.getDirectoryListing = getDirectoryListing;
window.readFileAsBase64 = readFileAsBase64;
window.readFileAsText = readFileAsText;
window.getRecentPaths = getRecentPaths;
