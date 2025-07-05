document.addEventListener("DOMContentLoaded", async () => {
    const appContainer = document.getElementById('app');
    
    async function loadPredictions() {
        try {
            const response = await fetch('upcoming_predictions.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const events = await response.json();
            return events;
    } catch (error) {
            console.error("Could not load or parse upcoming_predictions.json:", error);
            appContainer.innerHTML = `<p class="error">Could not load prediction data. Please run the prediction script and ensure the JSON file is present.</p>`;
            return null;
        }
    }

    function calculateConsensus(fightData) {
        const fighter1 = fightData.fight.split(' vs. ')[0];
        let f1_prob_sum = 0;
        let valid_models = 0;

        for (const model in fightData.predictions) {
            const prediction = fightData.predictions[model];
            if (prediction.error || !prediction.probability) continue;

            const prob = parseFloat(prediction.probability) || 0;
            if (prediction.winner === fighter1) {
                f1_prob_sum += prob;
    } else {
                f1_prob_sum += (100 - prob);
            }
            valid_models++;
        }

        if (valid_models === 0) {
            return { consensusWinner: "N/A", consensusProbability: 0, fighter1, fighter2: fightData.fight.split(' vs. ')[1] };
        }

        const avg_f1_prob = f1_prob_sum / valid_models;
        const fighter2 = fightData.fight.split(' vs. ')[1];
        
        const consensusWinner = avg_f1_prob >= 50 ? fighter1 : fighter2;
        const consensusProbability = avg_f1_prob >= 50 ? avg_f1_prob : 100 - avg_f1_prob;

        return { consensusWinner, consensusProbability, fighter1, fighter2, avg_f1_prob };
    }

    function renderData(events) {
        if (!events || events.length === 0) {
            appContainer.innerHTML = `<p>No upcoming events with predictions found.</p>`;
        return;
    }

        appContainer.innerHTML = ''; // Clear loading/error message

        events.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = 'event-card';

            const headerEl = document.createElement('div');
            headerEl.className = 'event-header';
            headerEl.innerHTML = `<h2>${event.event_name}</h2><p>${event.event_date}</p>`;
            
            const fightsContainerEl = document.createElement('div');
            fightsContainerEl.className = 'fights-container';

            headerEl.addEventListener('click', () => {
                eventEl.classList.toggle('collapsed');
            });

            event.fights.forEach((fight) => {
                const consensus = calculateConsensus(fight);
                const fighter1WinnerClass = consensus.consensusWinner === consensus.fighter1 ? 'winner' : '';
                const fighter2WinnerClass = consensus.consensusWinner === consensus.fighter2 ? 'winner' : '';
                const fighter1LoserClass = consensus.consensusWinner === consensus.fighter2 ? 'loser' : '';
                const fighter2LoserClass = consensus.consensusWinner === consensus.fighter1 ? 'loser' : '';

                const tableRows = Object.entries(fight.predictions).map(([model, pred]) => {
                    const modelName = model.replace('Model.joblib', '');
                    const winner = pred.error ? 'Error' : pred.winner;
                    const prob = pred.error ? '-' : `${parseFloat(pred.probability).toFixed(1)}%`;
                    const winnerClass = winner === consensus.fighter1 ? 'winner-f1' : (winner === consensus.fighter2 ? 'winner-f2' : '');
                    return `<tr><td>${modelName}</td><td class="${winnerClass}">${winner}</td><td>${prob}</td></tr>`;
                }).join('');

                const fightEl = document.createElement('div');
                fightEl.className = 'fight-card';
                fightEl.innerHTML = `
                    <details class="details-breakdown">
                        <summary>
                            <div class="consensus-prediction">
                                <div class="fighter-display">
                                    <img src="crown.webp" class="winner-crown" style="visibility: ${fighter1WinnerClass ? 'visible' : 'hidden'}">
                                    <div class="fighter-name ${fighter1WinnerClass} ${fighter1LoserClass}">${consensus.fighter1}</div>
                                </div>
                                <div class="prediction-bar" 
                                     data-prob-f1="${consensus.avg_f1_prob.toFixed(1)}%"
                                     data-prob-f2="${(100 - consensus.avg_f1_prob).toFixed(1)}%">
                                    <div class="bar-fighter1" style="width: ${consensus.avg_f1_prob}%"></div>
                                    <div class="prob-text f1-prob">${consensus.avg_f1_prob.toFixed(1)}%</div>
                                    <div class="prob-text f2-prob">${(100 - consensus.avg_f1_prob).toFixed(1)}%</div>
                                    <div class="mobile-arrow"></div>
                                </div>
                                <div class="fighter-display">
                                    <img src="crown.webp" class="winner-crown" style="visibility: ${fighter2WinnerClass ? 'visible' : 'hidden'}">
                                    <div class="fighter-name ${fighter2WinnerClass} ${fighter2LoserClass}">${consensus.fighter2}</div>
                                </div>
                            </div>
                        </summary>
                        <div class="table-wrapper">
                            <table>
                                <thead>
                                    <tr><th>Model</th><th>Predicted Winner</th><th>Confidence</th></tr>
                                </thead>
                                <tbody>${tableRows}</tbody>
                            </table>
                        </div>
                    </details>
                `;
                fightsContainerEl.appendChild(fightEl);
            });

            eventEl.appendChild(headerEl);
            eventEl.appendChild(fightsContainerEl);
            appContainer.appendChild(eventEl);
        });
    }

    const predictionData = await loadPredictions();
    renderData(predictionData);
}); 