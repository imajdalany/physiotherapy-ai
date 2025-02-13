// src/App.tsx
import { useState, FormEvent } from "react";
import axios from "axios";

// hawraa srour
interface Exercise {
  name: string;
  steps: string[];
  precautions: string[];
  gifUrl: string;
}

interface ApiResponse {
  success: boolean;
  exercise: Exercise;
  disclaimer: string;
  error?: string;
}

function App() {
  const [painDescription, setPainDescription] = useState<string>("");
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setExercise(null);
    setDisclaimer("");
    setLoading(true);

    try {
      const response = await axios.post<ApiResponse>(
        "http://localhost:5000/api/recommendations",
        { painDescription }
      );

      if (response.data.success) {
        setExercise(response.data.exercise);
        setDisclaimer(response.data.disclaimer);
      } else {
        setError("No recommendation received.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Something went wrong!");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
      <h2>Physiotherapy Exercise Recommendation</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="painDescription">Describe your pain:</label>
          <textarea
            id="painDescription"
            value={painDescription}
            onChange={(e) => setPainDescription(e.target.value)}
            placeholder="Enter your pain description here..."
            style={{ width: "100%", height: "100px", marginTop: "8px" }}
            required
          />
        </div>
        <button type="submit" style={{ marginTop: "10px" }}>
          Get Recommendation
        </button>
      </form>

      {loading && <p>Loading recommendation...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {exercise && (
        <div style={{ marginTop: "20px" }}>
          <h3>{exercise.name}</h3>
          <img
            src={exercise.gifUrl}
            alt={exercise.name}
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <h4>Steps:</h4>
          <ol>
            {exercise.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
          <h4>Precautions:</h4>
          <ul>
            {exercise.precautions.map((precaution, index) => (
              <li key={index}>{precaution}</li>
            ))}
          </ul>
          <p style={{ fontStyle: "italic", marginTop: "10px" }}>{disclaimer}</p>
        </div>
      )}
    </div>
  );
}

export default App;
