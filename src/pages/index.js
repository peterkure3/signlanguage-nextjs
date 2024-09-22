import { useEffect, useRef, useState } from 'react'; 
import * as tf from '@tensorflow/tfjs';

export default function Home() {
    const videoRef = useRef(null);
    const [gestureText, setGestureText] = useState('');
    const [isRunning, setIsRunning] = useState(false); 
    const intervalRef = useRef(null); 
    const lastGestureRef = useRef(''); // To track the last detected gesture


    const startVideo = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;

        const model = await loadYOLOModel();

        intervalRef.current = setInterval(async () => {
            const gesture = await detectGesture(model, videoRef.current);
            
            // Only process if a gesture is detected and it has changed
            if (gesture && gesture !== lastGestureRef.current) {
                lastGestureRef.current = gesture; // Update last gesture

                const refinedText = await fetch('/api/chatgpt', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text: gesture }),
                }).then(res => res.json());

                const audio = await fetch('/api/whisper', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text: refinedText.text }),
                });

                if (audio.ok) {
                    const audioBlob = await audio.blob();
                    playAudio(audioBlob);
                    setGestureText(refinedText.text);
                } else {
                    console.error('Failed to fetch audio:', await audio.json());
                }
            }
        }, 100); // Check for gestures every 100ms
    };

    const stopVideo = () => {
        clearInterval(intervalRef.current);
        if (videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
        videoRef.current.srcObject = null;
        setIsRunning(false);
        lastGestureRef.current = ''; // Reset the last gesture when stopped
    };

    const loadYOLOModel = async () => {
        return await tf.loadGraphModel('/yolov5n_web_model/model.json');
    };

    const detectGesture = async (model, video) => {
        // Replace with actual YOLO detection logic
        // Simulate gesture detection
        const detectedGesture = Math.random() > 0.8 ? 'hello' : null; // Simulated logic: 20% chance of detecting a gesture
        return detectedGesture; 
    };

    const playAudio = (audioBlob) => {
        const audioURL = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioURL);
        audio.play();
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-4xl font-bold text-gray-800 mb-6">Sign Language to Speech</h1>
            <video 
                ref={videoRef} 
                autoPlay 
                muted 
                className="w-80 h-60 border-4 border-gray-300 rounded-lg shadow-lg mb-4"
            ></video>
            <p className="text-xl text-gray-700 italic mb-4">Detected Gesture: {gestureText}</p>
            <div className="space-x-4">
                {!isRunning ? (
                    <button 
                        onClick={() => {
                            setIsRunning(true);
                            startVideo();
                        }} 
                        className="px-4 py-2 bg-green-500 text-white rounded"
                    >
                        Start Detection
                    </button>
                ) : (
                    <button 
                        onClick={stopVideo} 
                        className="px-4 py-2 bg-red-500 text-white rounded"
                    >
                        Stop Detection
                    </button>
                )}
            </div>
        </div>
    );
}
