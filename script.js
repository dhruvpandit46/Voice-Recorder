document.addEventListener('DOMContentLoaded', () => {
    let mediaRecorder;
    let audioChunks = [];
    let audioCtx, analyser, dataArray, bufferLength, source;
    const recordingsContainer = document.getElementById('recordings');
    const startButton = document.getElementById('start-recording');
    const stopButton = document.getElementById('stop-recording');
    const saveButton = document.getElementById('save-recording');
    const waveformCanvas = document.getElementById('waveform');
    const waveform = waveformCanvas.getContext('2d');
    let animationId;
    let audioBlob;

    const STORAGE_KEY = 'saved_recordings';

    // 🎙️ Initialize recorder
    async function initRecorder() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            setupAnalyser(stream);

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioChunks = [];
                saveButton.disabled = false;
            };
        } catch (err) {
            alert('Microphone access is required to use this recorder.');
            console.error(err);
        }
    }

    // 📊 Setup audio analyser
    function setupAnalyser(stream) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        source = audioCtx.createMediaStreamSource(stream);

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        source.connect(analyser);
    }

    // 📈 Draw real-time waveform
    function drawWaveform() {
        waveform.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
        analyser.getByteTimeDomainData(dataArray);

        waveform.lineWidth = 2;
        waveform.strokeStyle = '#00f260';
        waveform.beginPath();

        const sliceWidth = waveformCanvas.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * waveformCanvas.height / 2;
            i === 0 ? waveform.moveTo(x, y) : waveform.lineTo(x, y);
            x += sliceWidth;
        }

        waveform.lineTo(waveformCanvas.width, waveformCanvas.height / 2);
        waveform.stroke();

        animationId = requestAnimationFrame(drawWaveform);
    }

    // 💾 Save recording
    function saveRecordingToDOM(url) {
        const recordingCard = document.createElement('div');
        recordingCard.classList.add('recording-card');

        recordingCard.innerHTML = `
            <audio controls src="${url}"></audio>
            <button class="delete-recording">Delete</button>
        `;

        const deleteButton = recordingCard.querySelector('.delete-recording');
        deleteButton.addEventListener('click', () => {
            recordingsContainer.removeChild(recordingCard);
            removeFromLocalStorage(url);
        });

        recordingsContainer.appendChild(recordingCard);
    }

    // 📦 Save to local storage
    function saveToLocalStorage(url) {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        existing.push(url);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }

    function removeFromLocalStorage(url) {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        const updated = existing.filter(item => item !== url);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    function loadFromLocalStorage() {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        saved.forEach(url => saveRecordingToDOM(url));
    }

    // 🧠 Event Listeners
    startButton.addEventListener('click', () => {
        if (!mediaRecorder) return alert('Recorder not initialized. Please refresh the page.');
        mediaRecorder.start();
        startButton.disabled = true;
        stopButton.disabled = false;
        saveButton.disabled = true;
        drawWaveform();
    });

    stopButton.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            startButton.disabled = false;
            stopButton.disabled = true;
            cancelAnimationFrame(animationId);
            waveform.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
        }
    });

    saveButton.addEventListener('click', () => {
        if (!audioBlob) return alert('No recording available to save.');
        const url = URL.createObjectURL(audioBlob);
        saveRecordingToDOM(url);
        saveToLocalStorage(url);
        saveButton.disabled = true;
        audioBlob = null;
    });

    initRecorder();
    loadFromLocalStorage();
});
