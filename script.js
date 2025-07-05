import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client@1.15.4/dist/index.min.js";

const predictBtn = document.getElementById("predictBtn");
const fighter1Input = document.getElementById("fighter1");
const fighter2Input = document.getElementById("fighter2");
const modelSelector = document.getElementById("modelSelector");
const resultDiv = document.getElementById("result").querySelector('p');
const suggestions1Div = document.getElementById("suggestions1");
const suggestions2Div = document.getElementById("suggestions2");

let fighters = [];
let activeSuggestionIndex = -1;

async function loadFighters() {
    try {
        const response = await fetch('fighters.txt');
        const text = await response.text();
        fighters = text.split('\n').map(name => name.trim()).filter(name => name);
    } catch (error) {
        console.error("Could not load fighters list:", error);
    }
}

function showSuggestions(input, suggestionsDiv) {
    const inputText = input.value.toLowerCase();
    suggestionsDiv.innerHTML = '';
    activeSuggestionIndex = -1; 
    if (inputText.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
    }

    const filteredFighters = fighters.filter(f => f.toLowerCase().includes(inputText)).slice(0, 5);

    if (filteredFighters.length > 0) {
        filteredFighters.forEach(fighter => {
            const div = document.createElement('div');
            div.textContent = fighter;
            div.classList.add('suggestion-item');
            div.addEventListener('click', () => {
                input.value = fighter;
                suggestionsDiv.style.display = 'none';
            });
            suggestionsDiv.appendChild(div);
        });
        suggestionsDiv.style.display = 'block';
    } else {
        suggestionsDiv.style.display = 'none';
    }
}

function handleKeyDown(e, input, suggestionsDiv) {
    const items = suggestionsDiv.querySelectorAll('.suggestion-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeSuggestionIndex++;
        if (activeSuggestionIndex >= items.length) activeSuggestionIndex = 0;
        updateActiveSuggestion(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeSuggestionIndex--;
        if (activeSuggestionIndex < 0) activeSuggestionIndex = items.length - 1;
        updateActiveSuggestion(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeSuggestionIndex > -1) {
            items[activeSuggestionIndex].click();
        }
    }
}

function updateActiveSuggestion(items) {
    items.forEach((item, index) => {
        if (index === activeSuggestionIndex) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}

fighter1Input.addEventListener('input', () => showSuggestions(fighter1Input, suggestions1Div));
fighter2Input.addEventListener('input', () => showSuggestions(fighter2Input, suggestions2Div));

fighter1Input.addEventListener('keydown', (e) => handleKeyDown(e, fighter1Input, suggestions1Div));
fighter2Input.addEventListener('keydown', (e) => handleKeyDown(e, fighter2Input, suggestions2Div));


document.addEventListener('click', (e) => {
    if (e.target !== fighter1Input) {
        suggestions1Div.style.display = 'none';
    }
    if (e.target !== fighter2Input) {
        suggestions2Div.style.display = 'none';
    }
});

predictBtn.addEventListener("click", async () => {
    const fighter1 = fighter1Input.value;
    const fighter2 = fighter2Input.value;
    const modelName = modelSelector.value;

    if (!fighter1 || !fighter2) {
        resultDiv.textContent = "Please enter both fighter names.";
        return;
    }

    resultDiv.textContent = "Predicting...";

    try {
        const app = await Client.connect("AlvaroMros/ufc-predictor");
        const result = await app.predict("/predict_fight", [
            modelName,
            fighter1,
            fighter2,
        ]);
        
        resultDiv.textContent = result.data[0];
    } catch (error) {
        console.error("Prediction failed:", error);
        resultDiv.textContent = "Could not get prediction. See console for details.";
    }
});

loadFighters(); 