import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';

// Set WebGL backend for better performance
tf.setBackend('webgl');

const gestureMap = {
    0: 'thumbs_up',
    1: 'open_palm',
    2: 'pointing',
    3: 'peace_sign',
    4: 'fist',
    // Add more gestures as needed
};

export default function Home() {
    const videoRef = useRef(null);
    const [gestureText, setGestureText] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef(null);
    const lastGestureRef = useRef('');
    const audioCache = useRef({});
    const [debugMode, setDebugMode] = useState(false);
    const canvasRef = useRef(null);
    const modelRef = useRef(null);

    const startVideo = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRef.current.srcObject = stream;

            if (!modelRef.current) {
                modelRef.current = await loadYOLOModel();
            }
            if (!modelRef.current) {
                console.error('Model not loaded, cannot start detection.');
                return;
            }

            intervalRef.current = setInterval(async () => {
                try {
                    const gesture = await detectGesture(modelRef.current, videoRef.current);

                    if (gesture && gesture !== lastGestureRef.current) {
                        lastGestureRef.current = gesture;

                        const refinedText = await fetch('/api/chatgpt', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: gesture }),
                        }).then(res => res.json());

                        const audioBlob = await fetchAudio(refinedText.text);
                        if (audioBlob) {
                            playAudio(audioBlob);
                            setGestureText(refinedText.text);
                        }
                    }
                } catch (detectionError) {
                    console.error('Error detecting gesture:', detectionError);
                }
            }, 300);
        } catch (error) {
            console.error('Error starting video:', error);
        }
    }, []);

    const stopVideo = useCallback(() => {
        clearInterval(intervalRef.current);
        if (videoRef.current?.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
        videoRef.current.srcObject = null;
        setIsRunning(false);
        lastGestureRef.current = '';
    }, []);

    const loadYOLOModel = async () => {
        try {
            const model = await tf.loadGraphModel('/yolov5n_web_model/model.json');
            console.log('YOLO model loaded successfully');
            return model;
        } catch (error) {
            console.error('Error loading YOLO model:', error);
            return null;
        }
    };

    const detectGesture = async (model, video) => {
        const inputTensor = tf.tidy(() => {
            return tf.browser.fromPixels(video)
                .resizeBilinear([640, 640])
                .expandDims(0)
                .div(255.0);
        });

        const prediction = await model.executeAsync(inputTensor);
        const [boxesTensor, scoresTensor, classesTensor, validDetections] = prediction;

        const boxes = await boxesTensor.array();
        const scores = await scoresTensor.array();
        const classes = await classesTensor.array();
        const numValidDetections = await validDetections.array();

        tf.dispose(prediction);
        tf.dispose(inputTensor);

        const confidenceThreshold = 0.5;
        let highestConfidence = 0;
        let detectedGesture = null;

        for (let i = 0; i < numValidDetections[0]; i++) {
            if (scores[0][i] > confidenceThreshold && scores[0][i] > highestConfidence) {
                highestConfidence = scores[0][i];
                detectedGesture = gestureMap[Math.round(classes[0][i])] || 'unknown';
            }
        }

        if (debugMode && canvasRef.current) {
            drawDebugInfo(canvasRef.current, boxes[0], scores[0], classes[0], numValidDetections[0], video.videoWidth, video.videoHeight);
        }

        console.log('Detected Gesture:', detectedGesture, 'Confidence:', highestConfidence); // Enhanced logging
        return detectedGesture;
    };

    const drawDebugInfo = (canvas, boxes, scores, classes, numValidDetections, videoWidth, videoHeight) => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const scaleX = canvas.width / 640;
        const scaleY = canvas.height / 640;

        for (let i = 0; i < numValidDetections; i++) {
            if (scores[i] > 0.5) {
                const [y, x, height, width] = boxes[i];
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 2;
                ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY);

                ctx.fillStyle = 'red';
                ctx.font = '18px Arial';
                ctx.fillText(
                    `${gestureMap[Math.round(classes[i])] || 'unknown'}: ${scores[i].toFixed(2)}`,
                    x * scaleX,
                    y * scaleY - 5
                );
            }
        }
    };

    const fetchAudio = async (text) => {
        if (audioCache.current[text]) {
            return audioCache.current[text];
        }

        try {
            const response = await fetch('/api/whisper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            if (!response.ok) throw new Error('Failed to fetch audio');
            const audioBlob = await response.blob();
            audioCache.current[text] = audioBlob;
            return audioBlob;
        } catch (error) {
            console.error('Error fetching audio:', error);
        }
    };

    const playAudio = (audioBlob) => {
        const audioURL = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioURL);
        audio.play();
    };

    useEffect(() => {
        if (isRunning && debugMode) {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            if (canvas && video) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            } else {
                console.error('Canvas or video reference is null');
            }
        }
    }, [isRunning, debugMode]);

    const startDetection = useCallback(() => {
        intervalRef.current = setInterval(async () => {
            try {
                const gesture = await detectGesture(modelRef.current, videoRef.current);

                if (gesture && gesture !== lastGestureRef.current) {
                    lastGestureRef.current = gesture;

                    const refinedText = await fetch('/api/chatgpt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: gesture }),
                    }).then(res => res.json());

                    const audioBlob = await fetchAudio(refinedText.text);
                    if (audioBlob) {
                        playAudio(audioBlob);
                        setGestureText(refinedText.text);
                    }
                }
            } catch (detectionError) {
                console.error('Error detecting gesture:', detectionError);
            }
        }, 300);
    }, []);

    const reloadDetector = useCallback(async () => {
        clearInterval(intervalRef.current);
        lastGestureRef.current = '';
        setGestureText('');

        // Reload the model
        try {
            modelRef.current = await loadYOLOModel();
            if (!modelRef.current) {
                console.error('Failed to reload the model');
                return;
            }
            console.log('Model reloaded successfully');

            // Restart detection
            startDetection();
        } catch (error) {
            console.error('Error reloading detector:', error);
        }
    }, [startDetection]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-4xl font-bold text-gray-800 mb-6">Sign Language to Speech</h1>
            <div className="relative">
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className="w-80 h-60 border-4 border-gray-300 rounded-lg shadow-lg mb-4"
                ></video>
                {debugMode && (
                    <>
                        <canvas ref={canvasRef} className="absolute top-0 left-0" style={{ display: debugMode ? 'block' : 'none' }}></canvas>
                        <div className="mt-4 p-4 bg-white border border-gray-300 rounded-lg shadow-lg">
                            <h2 className="text-lg font-semibold mb-2 text-gray-800">Debug Information:</h2>
                            <p className="text-gray-700">Last Detected Gesture: {lastGestureRef.current}</p>
                            <p className="text-gray-700">Current Gesture Text: {gestureText}</p>
                        </div>
                    </>
                )}
            </div>
            <p className="text-xl text-gray-700 italic mb-4">
                Detected Gesture: {gestureText}
            </p>
            <div className="space-x-4 mb-4">
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
                <button
                    onClick={() => setDebugMode(!debugMode)}
                    className={`px-4 py-2 ${debugMode ? 'bg-blue-500' : 'bg-gray-500'} text-white rounded`}
                >
                    Debug Mode: {debugMode ? 'ON' : 'OFF'}
                </button>
                <button
                    onClick={reloadDetector}
                    className="px-4 py-2 bg-yellow-500 text-white rounded"
                    disabled={!isRunning}
                >
                    Reload Detector
                </button>
            </div>
            {isRunning ? (
                <p className="text-xl text-gray-700 italic mb-4">Detecting Gesture...</p>
            ) : (
                <p className="text-xl text-gray-700 italic mb-4">Detection Paused</p>
            )}
        </div>
    );
}
