const axios = require("axios");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const cloudflare_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const cloudflare_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const MODEL_NAME = "@cf/meta/llama-2-7b-chat-int8"; //

const exercisedb_API_KEY = process.env.EXERCISEDB_API_KEY;
const exercisedb_API_HOST = process.env.EXERCISEDB_API_HOST;

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${cloudflare_ACCOUNT_ID}/ai/run`;

const headers = {
  Authorization: `Bearer ${cloudflare_API_TOKEN}`,
  "Content-Type": "application/json",
};

const SYSTEM_PROMPT = `
You are a physiotherapy assistant that talks only in json format. Strictly follow these rules and dont say any word in the response other than the json :

1. Choose ONLY ONE exercise strictly from this strictly EXACT list (names are case-sensitive):
[
  "air bike",
  "bench dip (knees bent)",
  "bench hip extension",
  "bottoms-up",
  "chest dip",
  "chin-ups (narrow parallel grip)",
  "close-grip push-up",
  "crunch floor",
  "dead bug",
  "decline push-up",
  "diamond push-up",
  "donkey calf raise",
  "flutter kicks",
  "front plank with twist",
  "handstand push-up",
  "hanging leg raise",
  "hanging pike",
  "hyperextension",
  "incline push-up",
  "inverted row",
  "jackknife sit-up",
  "jump squat",
  "kipping muscle up",
  "mountain climber",
  "muscle up",
  "oblique crunches floor",
  "one arm chin-up",
  "pull-up",
  "push-up",
  "push-up to side plank",
  "reverse crunch",
  "reverse grip pull-up",
  "ring dips",
  "run",
  "russian twist",
  "scapular pull-up",
  "shoulder tap push-up",
  "single arm push-up",
  "superman push-up",
  "triceps dip",
  "wind sprints",
  "burpee",
  "clap push up",
  "plyo push up",
  "wide hand push up",
  "chin-up",
  "one leg squat",
  "sissy squat",
  "standing calf raise (on a staircase)",
  "hamstring stretch",
  "world greatest stretch",
  "lunge with twist",
  "single leg squat (pistol) male",
  "split squats",
  "scapula push-up",
  "glute-ham raise",
  "front lever",
  "back lever",
  "handstand",
  "skin the cat",
  "bear crawl",
  "skater hops",
  "l-pull-up",
  "l-sit on floor",
  "v-sit on floor",
  "glute bridge march",
  "lunge with jump",
  "reverse plank with leg lift",
  "curtsey squat",
  "archer pull up",
  "archer push up",
  "bodyweight drop jump squat",
  "pike-to-cobra push-up",
  "side lying hip adduction (male)",
  "standing archer"
]

dont say any word other than the json

2. Return JSON format ONLY with this structure without any word other than the json:
"{
  "exercises": [
    {
      "exercise_name": "Exercise Name ",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "precautions": ["Precaution 1", "Precaution 2"]
    }
  ],
  "disclaimer": "Consult a professional before attempting these exercises"
}"
dont say any word other than the json

3. RULES:
- MUST pick from the list above
- Use EXACT list names in lowercase
- Only return valid JSON, no extra text
- 3 steps max, 2 precautions max
- Focus on pain relief from description: 

dont say any word other than the json
`;
//const axios = require("axios");

//async function getPhysioAdvice(input) {
 // const url = "https://exercise-api.com/advice"; // ✅ Ensure this is correct
 // const params = { query: input };

  //try {
  //  const response = await axios.get(url, { params });
    
    // ✅ Check if the response structure is correct
  //  if (response.data && response.data.advice) {
    //  return response.data.advice;
   // } else {
    //  console.error("Unexpected response format:", response.data);
    //  return "No advice found. Please try again.";
   // }
//} catch (error) {
  //  console.error("Error fetching physiotherapy advice:", error.response?.data || error.message);
    
  //  return {
    //  error: error.response?.data || "An unexpected error occurred while fetching advice."};}}
   
async function getPhysioAdvice(userMessage) {
  const data = {
    messages: [
      {
        role: "system", // System role defines the AI's behavior
        content: SYSTEM_PROMPT,
      },
      {
        role: "user", // User's input (pain description)
        content: userMessage,
      },
    ],
  };

  try {
    const response = await axios.post(`${BASE_URL}/${MODEL_NAME}`, data, {
      headers,
    });
    let advice = response.data.result.response;
    advice = advice
  .replace(/```json/g, "")  // Remove markdown JSON markers
  .replace(/```/g, "")  // Remove ending markers
  .replace(/^"+|"+$/g, "")  // Remove extra surrounding quotes
  .trim();
   const parsedAdvice = JSON.parse(advice);
   return parsedAdvice;
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    return   error: error.response?.data || "An unexpected error occurred while fetching advice."
  }
}

async function getExerciseGif(exerciseName) {
  const encodedName = encodeURIComponent(exerciseName);
  const url = `https://exercisedb.p.rapidapi.com/exercises/name/${encodedName}`;

  try {
    const response = await axios.get(url, {
      headers: {
        "X-RapidAPI-Key": exercisedb_API_KEY,
        "X-RapidAPI-Host": exercisedb_API_HOST,
      },
    });

    if (response.data.length === 0) {
      console.log("No exercises found.");
      return null;
    }

    // Return the GIF URL of the first matching exercise
    const gifUrl = response.data[0].gifUrl;
    return gifUrl;
  } catch (error) {
    console.error("Error fetching exercise:", error.message);
    return null;
  }
}

async function retryWithDelay(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    console.log(`Retrying... (${retries} attempts left)`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithDelay(fn, retries - 1, delay * 2); // Exponential backoff
  }
}

const handleErrors = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
};

// (async () => {
//   const userPainDescription = "I have lower back pain from sitting too long.";

//   try {
//     const result = await retryWithDelay(async () => {
//       let advice = await getPhysioAdvice(userPainDescription);

//       // Clean and parse response
//       advice = JSON.parse(
//         advice
//           .replace(/```json/g, "")
//           .replace(/```/g, "")
//           .replace(/^"+|"+$/g, "") // Remove surrounding quotes
//           .trim()
//       );

//       // Validate exercise list (predefined for reliability)
//       const validExercises = [
//         "air bike",
//         "bench dip (knees bent)",
//         "bench hip extension",
//         "bottoms-up",
//         "chest dip",
//         "chin-ups (narrow parallel grip)",
//         "close-grip push-up",
//         "crunch floor",
//         "dead bug",
//         "decline push-up",
//         "diamond push-up",
//         "donkey calf raise",
//         "flutter kicks",
//         "front plank with twist",
//         "handstand push-up",
//         "hanging leg raise",
//         "hanging pike",
//         "hyperextension",
//         "incline push-up",
//         "inverted row",
//         "jackknife sit-up",
//         "jump squat",
//         "kipping muscle up",
//         "mountain climber",
//         "muscle up",
//         "oblique crunches floor",
//         "one arm chin-up",
//         "pull-up",
//         "push-up",
//         "push-up to side plank",
//         "reverse crunch",
//         "reverse grip pull-up",
//         "ring dips",
//         "run",
//         "russian twist",
//         "scapular pull-up",
//         "shoulder tap push-up",
//         "single arm push-up",
//         "superman push-up",
//         "triceps dip",
//         "wind sprints",
//         "burpee",
//         "clap push up",
//         "plyo push up",
//         "wide hand push up",
//         "chin-up",
//         "one leg squat",
//         "sissy squat",
//         "standing calf raise (on a staircase)",
//         "hamstring stretch",
//         "world greatest stretch",
//         "lunge with twist",
//         "single leg squat (pistol) male",
//         "split squats",
//         "scapula push-up",
//         "glute-ham raise",
//         "front lever",
//         "back lever",
//         "handstand",
//         "skin the cat",
//         "bear crawl",
//         "skater hops",
//         "l-pull-up",
//         "l-sit on floor",
//         "v-sit on floor",
//         "glute bridge march",
//         "lunge with jump",
//         "reverse plank with leg lift",
//         "curtsey squat",
//         "archer pull up",
//         "archer push up",
//         "bodyweight drop jump squat",
//         "pike-to-cobra push-up",
//         "side lying hip adduction (male)",
//         "standing archer",
//       ].map((e) => e.toLowerCase());

//       const recommendedExercise =
//         advice.exercises[0].exercise_name.toLowerCase();

//       if (!validExercises.includes(recommendedExercise)) {
//         throw new Error(`Invalid exercise: ${recommendedExercise}`);
//       }

//       // Verify structure
//       if (
//         !advice?.exercises?.[0]?.steps ||
//         !advice?.exercises?.[0]?.precautions
//       ) {
//         throw new Error("Invalid response structure");
//       }

//       // Try to get GIF
//       const gifUrl = await getExerciseGif(advice.exercises[0].exercise_name);
//       if (!gifUrl) throw new Error("Failed to get exercise GIF");

//       return { advice, gifUrl };
//     }, 5); // 5 retries max

//     // If successful
//     console.log("Exercise:", result.advice.exercises[0].exercise_name);
//     console.log("Steps:", result.advice.exercises[0].steps.join("\n- "));
//     console.log(
//       "Precautions:",
//       result.advice.exercises[0].precautions.join("\n- ")
//     );
//     console.log("GIF URL:", result.gifUrl);
//   } catch (error) {
//     console.error("Final error after retries:", error.message);
//   }
// })();

app.post("/api/recommendations", async (req, res) => {
  try {
    const { painDescription } = req.body;

    if (!painDescription) {
      return res.status(400).json({ error: "Pain description is required" });
    }

    // let advice = await getPhysioAdvice(painDescription);
    // advice = JSON.parse(
    //   advice
    //     .replace(/```json/g, "")
    //     .replace(/```/g, "")
    //     .trim()
    // );

    // // Validate exercise
    // const validExercises = SYSTEM_PROMPT.match(/\[.*?\]/s)[0]
    //   .replace(/"/g, "")
    //   .split(", ")
    //   .map((e) => e.trim().toLowerCase());

    // const recommendedExercise = advice.exercises[0].exercise_name.toLowerCase();

    // if (!validExercises.includes(recommendedExercise)) {
    //   return res.status(400).json({ error: "Invalid exercise recommended" });
    // }

    // // Get GIF URL
    // const gifUrl = await getExerciseGif(advice.exercises[0].exercise_name);

    const result = await retryWithDelay(async () => {
      let advice = await getPhysioAdvice(painDescription);

      // Clean and parse response
      advice = JSON.parse(
        advice
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .replace(/^"+|"+$/g, "") // Remove surrounding quotes
          .trim()
      );

      // Validate exercise list (predefined for reliability)
      const validExercises = [
        "air bike",
        "bench dip (knees bent)",
        "bench hip extension",
        "bottoms-up",
        "chest dip",
        "chin-ups (narrow parallel grip)",
        "close-grip push-up",
        "crunch floor",
        "dead bug",
        "decline push-up",
        "diamond push-up",
        "donkey calf raise",
        "flutter kicks",
        "front plank with twist",
        "handstand push-up",
        "hanging leg raise",
        "hanging pike",
        "hyperextension",
        "incline push-up",
        "inverted row",
        "jackknife sit-up",
        "jump squat",
        "kipping muscle up",
        "mountain climber",
        "muscle up",
        "oblique crunches floor",
        "one arm chin-up",
        "pull-up",
        "push-up",
        "push-up to side plank",
        "reverse crunch",
        "reverse grip pull-up",
        "ring dips",
        "run",
        "russian twist",
        "scapular pull-up",
        "shoulder tap push-up",
        "single arm push-up",
        "superman push-up",
        "triceps dip",
        "wind sprints",
        "burpee",
        "clap push up",
        "plyo push up",
        "wide hand push up",
        "chin-up",
        "one leg squat",
        "sissy squat",
        "standing calf raise (on a staircase)",
        "hamstring stretch",
        "world greatest stretch",
        "lunge with twist",
        "single leg squat (pistol) male",
        "split squats",
        "scapula push-up",
        "glute-ham raise",
        "front lever",
        "back lever",
        "handstand",
        "skin the cat",
        "bear crawl",
        "skater hops",
        "l-pull-up",
        "l-sit on floor",
        "v-sit on floor",
        "glute bridge march",
        "lunge with jump",
        "reverse plank with leg lift",
        "curtsey squat",
        "archer pull up",
        "archer push up",
        "bodyweight drop jump squat",
        "pike-to-cobra push-up",
        "side lying hip adduction (male)",
        "standing archer",
      ].map((e) => e.toLowerCase());

      const recommendedExercise =
        advice.exercises[0].exercise_name.toLowerCase();

      if (!validExercises.includes(recommendedExercise)) {
        throw new Error(`Invalid exercise: ${recommendedExercise}`);
      }

      // Verify structure
      if (
        !advice?.exercises?.[0]?.steps ||
        !advice?.exercises?.[0]?.precautions
      ) {
        throw new Error("Invalid response structure");
      }

      // Try to get GIF
      const gifUrl = await getExerciseGif(advice.exercises[0].exercise_name);
      if (!gifUrl) throw new Error("Failed to get exercise GIF");

      return { advice, gifUrl };
    }, 5); // 5 retries max

    res.json({
      success: true,
      exercise: {
        name: result.advice.exercises[0].exercise_name,
        steps: result.advice.exercises[0].steps,
        precautions: result.advice.exercises[0].precautions,
        gifUrl: result.gifUrl,
      },
      disclaimer: result.advice.disclaimer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start server
app.use(handleErrors);
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
