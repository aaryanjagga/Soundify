// Core player state    
        let currentQueue = [];
        let originalQueue = [];
        let currentIndex = -1;
        let isPlaying = false;
        let isShuffle = false;
        let repeatMode = 0; 

        const audio = document.getElementById('audio-engine');
        const playBtn = document.getElementById('btn-play-pause');
        const playPauseIcon = document.getElementById('play-pause-icon');
        
        const progressFillDesk = document.getElementById('progress-fill-desk');
        const progressFillMob = document.getElementById('progress-fill-mob');
        const progressContainerDesk = document.getElementById('progress-container-desk');
        const progressContainerMob = document.getElementById('progress-container-mob');

        const volumeFill = document.getElementById('volume-fill');
        const songListContainer = document.getElementById('song-list-container');

        function init() {
            parseSongsFromHTML();
            setupEventListeners();
            audio.volume = 0.8;
            if(volumeFill) volumeFill.style.width = '80%';
        }

        function parseSongsFromHTML() {
            const songElements = songListContainer.querySelectorAll('.song-row');
            currentQueue = [];
            
            songElements.forEach((el, index) => {
                const songData = {
                    id: el.dataset.id,
                    title: el.dataset.title,
                    artist: el.dataset.artist,
                    album: el.dataset.album,
                    duration: el.dataset.duration,
                    cover: el.dataset.cover,
                    src: el.dataset.src
                };
                currentQueue.push(songData);

                // Rebuild the HTML content based on device-aware CSS structure
                el.innerHTML = `
                    <span class="hidden md:block font-bold opacity-30 text-sm">${index + 1}</span>
                    <div class="flex items-center gap-3 md:gap-4 truncate">
                        <img src="${songData.cover}" onerror="this.src='https://via.placeholder.com/40?text=Art'" class="w-10 h-10 md:w-11 md:h-11 rounded-lg shadow-md object-cover flex-shrink-0">
                        <div class="flex flex-col truncate">
                            <span class="text-white font-semibold truncate text-sm md:text-base">${songData.title}</span>
                            <span class="text-[10px] md:text-xs text-slate-500 truncate">${songData.artist}</span>
                        </div>
                    </div>
                    <span class="hidden md:block truncate text-slate-400 text-sm">${songData.album}</span>
                    <span class="flex justify-end text-[10px] md:text-xs font-bold text-slate-500 pr-1">${songData.duration}</span>
                `;

                el.onclick = () => playSong(index);
            });

            originalQueue = [...currentQueue];
            document.getElementById('song-count-badge').innerText = `${currentQueue.length} tracks`;
        }

        async function playSong(index) {
            if (index < 0 || index >= currentQueue.length) return;
            currentIndex = index;
            const song = currentQueue[currentIndex];
            
            updateUI(song);
            updateActiveRow();
            
            audio.pause();
            audio.src = song.src;
            audio.load();
            
            try {
                await audio.play();
                isPlaying = true;
                updatePlayIcons();
            } catch (error) {
                console.warn("Playback failed. Path error or browser gesture required.", error);
                isPlaying = false;
                updatePlayIcons();
            }
        }

        function updateActiveRow() {
            const rows = songListContainer.querySelectorAll('.song-row');
            rows.forEach((row, i) => {
                row.classList.toggle('active', i === currentIndex);
            });
        }

        function togglePlay() {
            if (currentIndex === -1) { playSong(0); return; }
            if (isPlaying) { audio.pause(); isPlaying = false; } 
            else { audio.play().catch(e => console.warn(e)); isPlaying = true; }
            updatePlayIcons();
        }

        function updatePlayIcons() {
            const pausePath = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
            const playPath = '<path d="M8 5v14l11-7z"/>';
            playPauseIcon.innerHTML = isPlaying ? pausePath : playPath;
        }

        function updateUI(song) {
            document.getElementById('player-song-title').innerText = song.title;
            document.getElementById('player-artist-name').innerText = song.artist;
            const art = document.getElementById('player-album-art');
            art.src = song.cover;
            art.onerror = () => { art.src = 'https://via.placeholder.com/64?text=Art'; };
        }

        function format(s) {
            if (isNaN(s)) return "0:00";
            const m = Math.floor(s / 60);
            const sec = Math.floor(s % 60);
            return `${m}:${sec < 10 ? '0' : ''}${sec}`;
        }

        function setupEventListeners() {
            playBtn.onclick = togglePlay;
            document.getElementById('btn-next').onclick = () => playSong(currentIndex + 1);
            document.getElementById('btn-prev').onclick = () => playSong(currentIndex - 1);

            document.getElementById('btn-shuffle').onclick = (e) => {
                isShuffle = !isShuffle;
                e.currentTarget.classList.toggle('active', isShuffle);
                if(isShuffle) {
                    currentQueue = [...currentQueue].sort(() => Math.random() - 0.5);
                } else {
                    currentQueue = [...originalQueue];
                }
                updateActiveRow();
            };

            document.getElementById('btn-repeat').onclick = (e) => {
                repeatMode = (repeatMode + 1) % 3;
                e.currentTarget.classList.toggle('active', repeatMode > 0);
            };

            audio.ontimeupdate = () => {
                if (audio.duration) {
                    const pct = (audio.currentTime / audio.duration) * 100;
                    if(progressFillDesk) progressFillDesk.style.width = pct + '%';
                    if(progressFillMob) progressFillMob.style.width = pct + '%';
                    
                    const curTimeEl = document.getElementById('current-time');
                    const durEl = document.getElementById('duration-el');
                    if(curTimeEl) curTimeEl.innerText = format(audio.currentTime);
                    if(durEl) durEl.innerText = format(audio.duration);
                }
            };

            audio.onended = () => {
                if (repeatMode === 2) { audio.currentTime = 0; audio.play(); } 
                else { playSong(currentIndex + 1); }
            };

            const handleSeek = (e, container) => {
                const rect = container.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                if (audio.duration) audio.currentTime = pos * audio.duration;
            };

            if(progressContainerDesk) progressContainerDesk.onclick = (e) => handleSeek(e, progressContainerDesk);
            if(progressContainerMob) progressContainerMob.onclick = (e) => handleSeek(e, progressContainerMob);

            const volContainer = document.getElementById('volume-container');
            if(volContainer) {
                volContainer.onclick = (e) => {
                    const rect = volContainer.getBoundingClientRect();
                    const vol = (e.clientX - rect.left) / rect.width;
                    audio.volume = Math.max(0, Math.min(1, vol));
                    if(volumeFill) volumeFill.style.width = (vol * 100) + '%';
                };
            }
        }

        window.onload = init;
    
