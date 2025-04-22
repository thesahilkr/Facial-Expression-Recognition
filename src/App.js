import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

const emojiMap = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  surprised: "😲",
  neutral: "😐",
  disgusted: "🤢",
  fearful: "😨",
};

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [expression, setExpression] = useState("Loading...");
  const [emoji, setEmoji] = useState("😐");
  const [theme, setTheme] = useState("dark");
  const [voiceOn, setVoiceOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [history, setHistory] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const prevExpressionRef = useRef("");

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!voiceOn) {
      window.speechSynthesis.cancel();
    }
  }, [voiceOn]);

  const speak = (text) => {
    if (!voiceOn) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
        setCameraOn(true);
      })
      .catch((err) => console.error("Error accessing webcam:", err));
  };

  const stopVideo = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setCameraOn(false);
      setExpression("Camera Off");
      setEmoji("📷");
    }
  };

  useEffect(() => {
    let interval;
    if (cameraOn) {
      interval = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const detections = await faceapi
          .detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions()
          )
          .withFaceExpressions();

        const dims = {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        };

        faceapi.matchDimensions(canvasRef.current, dims);

        if (detections.length > 0) {
          const expressions = detections[0].expressions;
          const sorted = Object.entries(expressions).sort(
            (a, b) => b[1] - a[1]
          );
          const [maxExpression, maxConfidence] = sorted[0];

          if (maxExpression !== prevExpressionRef.current) {
            prevExpressionRef.current = maxExpression;
            setExpression(maxExpression);
            setEmoji(emojiMap[maxExpression] || "❓");
            setConfidence(Math.round(maxConfidence * 100));

            if (voiceOn) {
              speak(`You look ${maxExpression}`);
            }

            setHistory((prev) => [
              {
                emoji: emojiMap[maxExpression],
                name: maxExpression,
                time: new Date(),
              },
              ...prev.slice(0, 4),
            ]);
          }

          const resized = faceapi.resizeResults(detections, dims);
          const ctx = canvasRef.current.getContext("2d");
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          faceapi.draw.drawDetections(canvasRef.current, resized);
          faceapi.draw.drawFaceExpressions(canvasRef.current, resized);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [cameraOn, voiceOn]);

  return (
    <div
      className={`${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900"
      } min-h-screen transition-all duration-300 px-4 py-6`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-4xl font-bold text-center md:text-left">
            Facial Expression Recognition
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
            >
              {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>
            <button
              onClick={() => setVoiceOn(!voiceOn)}
              className={`px-4 py-2 rounded-lg ${
                voiceOn ? "bg-blue-600" : "bg-gray-500"
              } text-white transition`}
            >
              {voiceOn ? "🔊 Voice On" : "🔇 Voice Off"}
            </button>
          </div>
        </div>

        {/* Video Section */}
        <div className="relative border-4 border-yellow-400 rounded-xl overflow-hidden shadow-lg max-w-3xl mx-auto">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="rounded-lg w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
        </div>

        {/* Expression & Emoji */}
        <div className="mt-6 text-center">
          <p className="text-xl">Detected Expression:</p>
          <div className="text-7xl font-bold animate-bounce transition-all duration-500">
            {emoji}
          </div>
          <div className="text-lg mt-2 capitalize">{expression}</div>
          <div className="w-48 mx-auto mt-3">
            <div className="w-full bg-gray-300 h-4 rounded-full overflow-hidden">
              <div
                className="bg-yellow-400 h-4 transition-all duration-300"
                style={{ width: `${confidence}%` }}
              />
            </div>
            <p className="text-sm mt-1">{confidence}% confidence</p>
          </div>
        </div>

        {/* Camera Controls */}
        <div className="mt-8 flex justify-center gap-4">
          {!cameraOn ? (
            <button
              onClick={startVideo}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white font-semibold transition"
            >
              Start Camera
            </button>
          ) : (
            <button
              onClick={stopVideo}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white font-semibold transition"
            >
              Stop Camera
            </button>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-10 w-full">
            <h2 className="text-2xl font-semibold mb-4">Expression History</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center p-3 rounded-lg bg-gray-800 text-white shadow-md"
                >
                  <div className="text-4xl">{item.emoji}</div>
                  <div className="capitalize">{item.name}</div>
                  <div className="text-xs text-gray-400">
                    {item.time.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
