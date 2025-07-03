import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client@1.15.4/dist/index.min.js";

const predictBtn = document.getElementById("predictBtn");
const fighter1Input = document.getElementById("fighter1");
const fighter2Input = document.getElementById("fighter2");
const resultDiv = document.getElementById("result").querySelector('p');

predictBtn.addEventListener("click", async () => {
    const fighter1 = fighter1Input.value;
    const fighter2 = fighter2Input.value;

    if (!fighter1 || !fighter2) {
        resultDiv.textContent = "Please enter both fighter names.";
        return;
    }

    resultDiv.textContent = "Predicting...";

    try {
        const client = await Client.connect("AlvaroMros/ufc-predictor");
        const result = await client.predict("/predict_fight", { 		
            fighter1_name: fighter1, 		
            fighter2_name: fighter2, 
        });
        
        resultDiv.textContent = result.data[0];
    } catch (error) {
        console.error("Prediction failed:", error);
        resultDiv.textContent = "Could not get prediction. See console for details.";
    }
}); 