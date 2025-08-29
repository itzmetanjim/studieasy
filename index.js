let currentTab = 0; //as an index
const tabIds = ["uploadTab", "generateTab"];
const workspaceGrid = document.getElementById("workspaceGrid");
function showTab(tabIndex) {
    currentTab = tabIndex;
    tabIds.forEach((tab, index) => {
        document.getElementById(tab).style.display = index === tabIndex ? "block" : "none";
    });
}
showTab(currentTab);
window.showTab = showTab;

/* Directory Access System with File System API */

//Global variables for directory handling
let currentDirectoryHandle = null;
let currentDirectoryPath = '';
const RECENT_PATHS_KEY = 'studieasy_recent_paths';
const MAX_RECENT_PATHS = 10;

//Initialize directory system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initDirectorySystem();
});

function initDirectorySystem() {
    const directoryBtn = document.getElementById('directoryBtn');
    const openDirectoryBtn = document.getElementById('openDirectoryBtn');

    //Check if File System API is supported
    const supportsFileSystemAPI = 'showDirectoryPicker' in window;

    if (!supportsFileSystemAPI) {
        console.warn('File System API not supported in this browser');
        updateDirectoryDisplay('File System API not supported');
        return;
    }

    //Event listeners
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
        
        //Add to recent paths
        addToRecentPaths(currentDirectoryPath);
        
        //Update UI
        updateDirectoryDisplay(currentDirectoryPath);
        
        console.log('Directory selected:', currentDirectoryPath);
        renderWorkspaceGrid();
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
    //Here you would typically navigate to a directory view or perform directory operations
    alert(`Directory opened: ${currentDirectoryPath}`);
}

function updateDirectoryDisplay(pathText) {
    const directoryPath = document.getElementById('directoryPath');
    if (directoryPath) {
        directoryPath.textContent = pathText || 'No directory chosen';
    }
}

//Recent paths management
function addToRecentPaths(path) {
    let recentPaths = getRecentPaths();
    
    //Remove if already exists
    recentPaths = recentPaths.filter(p => p !== path);
    
    //Add to beginning
    recentPaths.unshift(path);
    
    //Limit to max items
    if (recentPaths.length > MAX_RECENT_PATHS) {
        recentPaths = recentPaths.slice(0, MAX_RECENT_PATHS);
    }
    
    //Save to localStorage
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

//Public function for UI to open a specific path
async function openPath(path) {
    try {
        //This is a placeholder since File System API doesn't support opening by path
        //In a real implementation, you'd need to store handles or use a different approach
        console.log('Opening path:', path);
        
        //Add to recent paths
        addToRecentPaths(path);
        
        //Update display
        updateDirectoryDisplay(path);

        renderWorkspaceGrid();
        
        return true;
    } catch (error) {
        console.error('Error opening path:', error);
        return false;
    }
}

//Get directory listing in a structured format
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
                    handle: handle,
                    isDirectory: false
                });
            } else if (handle.kind === 'directory') {
                listing.directories.push({
                    name: name,
                    path: fullPath,
                    handle: handle,
                    isDirectory: true
                });
            }
        }
        
        return listing;
    } catch (error) {
        console.error('Error reading directory:', error);
        throw error;
    }
}

//Read file content in OpenAI API format (base64)
async function readFileAsBase64(filePath, directoryHandle = currentDirectoryHandle) {
    if (!directoryHandle) {
        throw new Error('No directory handle available');
    }
    
    try {
        //Navigate to the file through the directory structure
        const pathParts = filePath.split('/').filter(part => part.length > 0);
        let currentHandle = directoryHandle;
        
        //Navigate through directories
        for (let i = 0; i < pathParts.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
        }
        
        //Get the file
        const fileName = pathParts[pathParts.length - 1];
        const fileHandle = await currentHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        
        //Convert to base64
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

//Alternative function to read file as text (for text files)
async function readFileAsText(filePath, directoryHandle = currentDirectoryHandle) {
    if (!directoryHandle) {
        throw new Error('No directory handle available');
    }
    
    try {
        //Navigate to the file through the directory structure
        const pathParts = filePath.split('/').filter(part => part.length > 0);
        let currentHandle = directoryHandle;
        
        //Navigate through directories
        for (let i = 0; i < pathParts.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
        }
        
        //Get the file
        const fileName = pathParts[pathParts.length - 1];
        const fileHandle = await currentHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        
        //Read as text
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

//Expose functions globally for UI use
window.openPath = openPath;
window.getDirectoryListing = getDirectoryListing;
window.readFileAsBase64 = readFileAsBase64;
window.readFileAsText = readFileAsText;
window.getRecentPaths = getRecentPaths;

function renderWorkspaceGrid(directoryHandle = currentDirectoryHandle) {
    if (!directoryHandle) {
        console.error('No directory handle available');
        return;
    }

    //Clear the existing grid
    workspaceGrid.innerHTML = '';

    //Get the directory listing
    getDirectoryListing(directoryHandle)
        .then(listing => {
            //If listing is empty
            if(listing.files.length === 0 && listing.directories.length === 0) {
                const emptyNoticeElem = document.createElement('span');
                emptyNoticeElem.className = 'text-sm text-gray-600';
                emptyNoticeElem.textContent = 'This directory is empty. Use the Generate tab to generate new files or paste files into the directory.';
                workspaceGrid.appendChild(emptyNoticeElem);
            }
            //Render files
            listing.files.forEach(file => {
                const fileElement = document.createElement('div');
                fileElement.className = 'p-4 border rounded hover:bg-gray-100';
                workspaceGrid.appendChild(fileElement);
                const nameElement = document.createElement('span')
                nameElement.textContent = file.name
                nameElement.className = 'block mx-auto text-center'
                fileElement.appendChild(nameElement)
                const iconElement = document.createElement('img')
                const endings = {
                    '.html': 'html.png',
                    '.css': 'other_code.png',
                    '.js': 'js.png',
                    '.json': 'other_code.png',
                    '.jsx': 'other_code.png',
                    '.ts': 'other_code.png',
                    '.tsx': 'other_code.png',
                    '.c': 'other_code.png',
                    '.cpp': 'other_code.png',
                    '.h': 'other_code.png',
                    '.hpp': 'other_code.png',
                    '.java': 'other_code.png',
                    '.py': 'other_code.png',
                    '.rb': 'other_code.png',
                    '.go': 'other_code.png',
                    '.rs': 'other_code.png',
                    '.sh': 'other_code.png',
                    '.bat': 'other_code.png',
                    '.yml': 'other_code.png',
                    '.yaml': 'other_code.png',
                    '.ini': 'other_code.png',
                    '.toml': 'other_code.png',
                    '.php': 'other_code.png',
                    '.cs': 'other_code.png',
                    '.swift': 'other_code.png',
                    '.kt': 'other_code.png',
                    '.scala': 'other_code.png',
                    '.lua': 'other_code.png',
                    '.txt': 'txt.png',
                    '.md': 'txt.png',
                    '.zip': 'zip.png',
                    '.pdf': 'pdf.png',
                    '.apk': 'apk.png',
                    '.ppt': 'ppt.png',
                    '.xls': 'xls.png',
                    '.doc': 'doc.png',
                    '.docx': 'doc.png',
                    '.iso': 'iso.png',
                    '.eot': 'any_font_file.png',
                    '.ttf': 'any_font_file.png',
                    '.woff': 'any_font_file.png',
                    '.woff2': 'any_font_file.png',
                    '.otf': 'any_font_file.png',
                    '.mp3': 'any_audio_file.png',
                    '.wav': 'any_audio_file.png',
                    '.flac': 'any_audio_file.png',
                    '.aac': 'any_audio_file.png',
                    '.ogg': 'any_audio_file.png',
                    '.m4a': 'any_audio_file.png',
                    '.wma': 'any_audio_file.png',
                    '.mp4': 'any_video_file.png',
                    '.mov': 'any_video_file.png',
                    '.avi': 'any_video_file.png'
                };
                
                const ext = (file.name.match(/\.[^\.]+$/) || [''])[0].toLowerCase();
                //If file cant have dynamic thumbnails (like images)
                if(!["png","jpg","jpeg","gif","mp4","mkv","mov","wmv","pdf","svg"].includes(ext.replace('.',''))){
                    const iconName = endings[ext] || 'unrecognized_file.png';
                    iconElement.setAttribute('src', `file_icons/${iconName}`);
                    iconElement.setAttribute('alt', `${ext || 'file'} icon for ${file.name}`);
                    iconElement.setAttribute('class', 'mx-auto block');
                    iconElement.setAttribute('width', '200');
                }
                else if (["png","jpg","jpeg","gif","svg"].includes(ext.replace('.',''))){
                    //Generate dynamic thumbnail
                    createImage = () => {
                        const imgElement = document.createElement('img');
                        imgElement.setAttribute('src', fr.result);
                        imgElement.setAttribute('alt', `${file.name} image thumbnail`);
                        imgElement.setAttribute('class', 'mx-auto block');
                        imgElement.setAttribute('width', '200');
                        fileElement.appendChild(imgElement);
                    }
                    var fr = new FileReader();
                    fr.onload = createImage;   //onload fires after reading is complete
                    fr.readAsDataURL(file);    //begin reading
                }
                else if (["mp4","mkv","mov","wmv"].includes(ext.replace('.',''))){
                    //get the video, then get a frame of it
                    createThumb = ()=>{
                        const tempVideo = document.createElement('video');
                        tempVideo.src = fr.result;
                        tempVideo.width = 200;
                        document.body.appendChild(tempVideo);
                        const canvasElement = document.createElement('canvas');
                        canvasElement.getContext('2d').drawImage(tempVideo,0,0);
                        tempVideo.style.display = 'none';
                        tempVideo.remove();
                        const thumbnail = canvasElement.toDataURL('image/png');
                        const imgElement = document.createElement('img');
                        imgElement.setAttribute('src', thumbnail);
                        imgElement.setAttribute('alt', `${file.name} video thumbnail`);
                        imgElement.setAttribute('class', 'mx-auto block');
                        imgElement.setAttribute('width', '200');
                        fileElement.appendChild(imgElement);
                    }
                    var fr = new FileReader();
                    fr.onload = createThumb;   
                    fr.readAsDataURL(file);    
                }
            });

            //Render directories
            listing.directories.forEach(dir => {
                const dirElement = document.createElement('div');
                dirElement.className = 'p-4 border rounded hover:bg-gray-100';
                workspaceGrid.appendChild(dirElement);
                const nameElement = document.createElement('span')
                nameElement.textContent = dir.name+"/"
                nameElement.className = 'block mx-auto text-center'
                dirElement.appendChild(nameElement)
                const iconElement = document.createElement('img')
                iconElement.setAttribute('src', 'folder-icon.png');
                iconElement.setAttribute('alt', 'Folder Icon');
                iconElement.setAttribute('class', 'mx-auto block');
                iconElement.setAttribute('width', '200');
                dirElement.appendChild(iconElement);
            });
        })
        .catch(error => {
            console.error('Error rendering workspace grid:', error);
        });
}
renderWorkspaceGrid();
