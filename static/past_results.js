document.addEventListener('DOMContentLoaded', () => {
    const scoreboardDiv = document.getElementById('scoreboard');
    const pastEventsDiv = document.getElementById('past-events');

    if (!scoreboardDiv || !pastEventsDiv) {
        console.error('Required divs not found in the DOM.');
        return;
    }

    const fetchData = async () => {
        try {
            const response = await fetch('data/past_event_results.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching past results:', error);
            scoreboardDiv.innerHTML = '<p class="error">Could not load scoreboard data.</p>';
            pastEventsDiv.innerHTML = '<p class="error">Could not load past results.</p>';
            return [];
        }
    };

    const calculateAccuracy = (data) => {
        const scoreboard = {};
        
        data.forEach(event => {
            event.results.forEach(fight => {
                if (fight.predictions && Object.keys(fight.predictions).length > 0) {
                    const actualWinner = fight.winner;
                    for (const model in fight.predictions) {
                        if (!scoreboard[model]) {
                            scoreboard[model] = { correct: 0, total: 0 };
                        }
                        const prediction = fight.predictions[model];
                        if (prediction.winner === actualWinner) {
                            scoreboard[model].correct++;
                        }
                        scoreboard[model].total++;
                    }
                }
            });
        });
        return scoreboard;
    };

    const renderScoreboard = (scoreboard) => {
        const sortedModels = Object.entries(scoreboard).sort(([, a], [, b]) => {
            const accuracyA = a.total > 0 ? (a.correct / a.total) : 0;
            const accuracyB = b.total > 0 ? (b.correct / b.total) : 0;
            return accuracyB - accuracyA;
        });

        const topThree = sortedModels.slice(0, 3);

        if (topThree.length === 0) {
            scoreboardDiv.innerHTML = "<p>Not enough data to create a scoreboard.</p>";
            return;
        }

        const medalSVGs = [
            'static/gold_medal.svg',
            'static/silver_medal.svg',
            'static/bronze_medal.svg'
        ];

        let html = '<div class="scoreboard-list">';
        
        topThree.forEach(([model, stats], index) => {
            const accuracy = stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) : '0.0';
            const modelName = model.replace('Model.joblib', '');
            const medalImg = `<img src="${medalSVGs[index]}" alt="Rank ${index + 1}" class="scoreboard-medal" />`;

            html += `
                <div class="scoreboard-item">
                    <div class="scoreboard-rank">${medalImg}</div>
                    <div class="scoreboard-model-name">${modelName}</div>
                    <div class="scoreboard-stats">
                        <span class="scoreboard-accuracy">${accuracy}%</span>
                        <span class="scoreboard-record">(${stats.correct}/${stats.total})</span>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        scoreboardDiv.innerHTML = html;
    };

    const renderPastEvents = (data) => {
        if (!data || data.length === 0) {
            pastEventsDiv.innerHTML = '<p>No past event data to display.</p>';
            return;
        }

        let html = '';
        data.forEach(event => {
            // Add collapsible class and data-target
            html += `<div class="event-card past-event-card">
                <h3 class="collapsible-header" data-target="event-${event.event_name.replace(/\s+/g, '-')}">${event.event_name}</h3>
                <p class="event-date">${event.event_date}</p>
                <div id="event-${event.event_name.replace(/\s+/g, '-')}" class="past-fights-container collapsible-content">`;
            
            event.results.forEach((fight, index) => {
                const actualWinner = fight.winner;
                const fightId = `${event.event_name.replace(/\s+/g, '-')}-fight-${index}`;
                
                // Calculate model accuracy for this specific fight
                let correct_predictions = 0;
                let total_predictions = 0;
                if (fight.predictions && Object.keys(fight.predictions).length > 0) {
                    total_predictions = Object.keys(fight.predictions).length;
                    for (const model in fight.predictions) {
                        if (fight.predictions[model].winner === actualWinner) {
                            correct_predictions++;
                        }
                    }
                }
                
                html += `<div class="past-fight">
                    <div class="past-fight-info">
                        <h4>${fight.fight.replace('vs.', 'vs. ')}</h4>
                        <p><strong>Actual Winner:</strong> <span class="actual-winner">${actualWinner}</span></p>
                    </div>
                    <div class="past-fight-predictions">
                        <p class="model-accuracy-summary collapsible-header" data-target="${fightId}">
                            <span class="correct-count">${correct_predictions}</span> / <span class="total-count">${total_predictions}</span>
                            Models Correct
                        </p>
                        <ul id="${fightId}" class="collapsible-content">`;

                if (fight.predictions && Object.keys(fight.predictions).length > 0) {
                    // Sort predictions to maintain consistent order
                    const sortedPredictions = Object.entries(fight.predictions);

                    for (const [model, prediction] of sortedPredictions) {
                        const predictedWinner = prediction.winner;
                        const probability = prediction.probability || 'N/A';
                        const isCorrect = predictedWinner === actualWinner;
                        const icon = isCorrect ? '<span class="correct-pick">✔</span>' : '<span class="incorrect-pick">✘</span>';
                        const modelName = model.replace('Model.joblib', '');
                        html += `<li>${icon} ${modelName}: ${predictedWinner} <span class="probability">(${probability})</span></li>`;
                    }
                } else {
                    html += '<li>No predictions were made for this fight.</li>';
                }

                html += `</ul></div></div>`;
            });

            html += `</div></div>`;
        });

        pastEventsDiv.innerHTML = html;
    };

    const addCollapsibleListeners = () => {
        pastEventsDiv.addEventListener('click', (e) => {
            const header = e.target.closest('.collapsible-header');
            if (!header) return;

            header.classList.toggle('active');
            const contentId = header.getAttribute('data-target');
            const content = document.getElementById(contentId);

            if (content) {
                // Toggle the clicked element's content area
                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                }

                // Check if this collapsible is nested inside another one.
                // If so, we need to update the parent's height to accommodate the change.
                const parentContent = header.closest('.collapsible-content');

                if (parentContent && parentContent.style.maxHeight) {
                    // We use a timeout that is slightly longer than the CSS transition duration
                    // to ensure the child's expansion/collapse animation is complete before
                    // we recalculate and set the parent's height. This prevents content from being cut off.
                    setTimeout(() => {
                        parentContent.style.maxHeight = parentContent.scrollHeight + "px";
                    }, 410); // CSS transition is 0.4s (400ms)
                }
            }
        });
    };

    const init = async () => {
        const pastResultsData = await fetchData();
        if (pastResultsData.length > 0) {
            const scoreboard = calculateAccuracy(pastResultsData);
            renderScoreboard(scoreboard);
            renderPastEvents(pastResultsData);
            addCollapsibleListeners();
            updateLastUpdatedTimestamp();

            // Automatically open the first event card by default
            const firstEventHeader = pastEventsDiv.querySelector('.event-card:first-child .collapsible-header');
            if (firstEventHeader) {
                firstEventHeader.click();
            }
        }
    };

    const updateLastUpdatedTimestamp = async () => {
        const timestampElement = document.getElementById('last-updated-timestamp');
        if (!timestampElement) {
            return;
        }

        try {
            // Fetch the upcoming predictions to get the last_updated timestamp
            const response = await fetch('data/upcoming_predictions.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const upcomingEvents = await response.json();
            
            if (upcomingEvents && upcomingEvents.length > 0 && upcomingEvents[0].last_updated) {
                const lastUpdated = upcomingEvents[0].last_updated;
                const date = new Date(lastUpdated);
                const formattedDate = date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short'
                });
                timestampElement.textContent = formattedDate;
            } else {
                timestampElement.textContent = 'Unknown';
            }
        } catch (error) {
            console.error('Error fetching/formatting timestamp:', error);
            timestampElement.textContent = 'Unknown';
        }
    };

    init();
}); 