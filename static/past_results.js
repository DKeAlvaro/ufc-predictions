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
                            scoreboard[model] = { correct: 0, total: 0, betting_wins: 0, betting_losses: 0, profit: 0 };
                        }
                        const prediction = fight.predictions[model];
                        if (prediction.winner === actualWinner) {
                            scoreboard[model].correct++;
                        }
                        scoreboard[model].total++;
                        
                        // Calculate betting success
                        if (fight.odds && fight.predictions) {
                            const betResult = calculateBetResult(fight, prediction.winner);
                            if (betResult.wagered) {
                                if (betResult.won) {
                                    scoreboard[model].betting_wins++;
                                    scoreboard[model].profit += betResult.profit;
                                } else {
                                    scoreboard[model].betting_losses++;
                                    scoreboard[model].profit -= betResult.wagered;
                                }
                            }
                        }
                    }
                }
            });
        });
        return scoreboard;
    };

    const calculateBetResult = (fight, predictedWinner) => {
        if (!fight.odds || !fight.odds.fighter1 || !fight.odds.fighter2) {
            return { wagered: 0, won: false, profit: 0 };
        }

        const fighters = fight.fight.split(' vs. ');
        const fighter1 = fighters[0];
        const fighter2 = fighters[1];
        
        let odds;
        if (predictedWinner === fighter1) {
            odds = fight.odds.fighter1.odds;
        } else if (predictedWinner === fighter2) {
            odds = fight.odds.fighter2.odds;
        } else {
            return { wagered: 0, won: false, profit: 0 };
        }

        // Only bet on underdogs (positive odds) or slight favorites
        const actualWinner = fight.winner;
        const won = predictedWinner === actualWinner;
        
        // Standard $100 wager
        const wagered = 100;
        let profit = 0;
        
        if (won) {
            if (odds > 0) {
                profit = (odds / 100) * wagered;
            } else {
                profit = (100 / Math.abs(odds)) * wagered;
            }
        }
        
        return { wagered, won, profit };
    };

    const calculateEventBestModel = (event) => {
        const scoreboard = {};
        event.results.forEach(fight => {
            if (fight.predictions && Object.keys(fight.predictions).length > 0) {
                const actualWinner = fight.winner;
                for (const model in fight.predictions) {
                    if (!scoreboard[model]) {
                        scoreboard[model] = { correct: 0, total: 0, betting_wins: 0, betting_losses: 0, profit: 0 };
                    }
                    const prediction = fight.predictions[model];
                    if (prediction.winner === actualWinner) {
                        scoreboard[model].correct++;
                    }
                    scoreboard[model].total++;
                    
                    // Calculate betting success
                    if (fight.odds && fight.predictions) {
                        const betResult = calculateBetResult(fight, prediction.winner);
                        if (betResult.wagered) {
                            if (betResult.won) {
                                scoreboard[model].betting_wins++;
                                scoreboard[model].profit += betResult.profit;
                            } else {
                                scoreboard[model].betting_losses++;
                                scoreboard[model].profit -= betResult.wagered;
                            }
                        }
                    }
                }
            }
        });

        if (Object.keys(scoreboard).length === 0) {
            return { bestModelName: 'N/A', correct: 0, total: 0, betting_wins: 0, betting_losses: 0, profit: 0 };
        }

        const sortedModels = Object.entries(scoreboard).sort(([, a], [, b]) => {
            const accuracyA = a.total > 0 ? (a.correct / a.total) : 0;
            const accuracyB = b.total > 0 ? (b.correct / b.total) : 0;
            if (accuracyB !== accuracyA) {
                return accuracyB - accuracyA;
            }
            return b.correct - a.correct; // Tie-breaker
        });

        const [bestModel, stats] = sortedModels[0];
        const bestModelName = bestModel.replace('Model.joblib', '');
        
        return { bestModelName, correct: stats.correct, total: stats.total, betting_wins: stats.betting_wins, betting_losses: stats.betting_losses, profit: stats.profit };
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
            const totalBets = stats.betting_wins + stats.betting_losses;
            const bettingAccuracy = totalBets > 0 ? ((stats.betting_wins / totalBets) * 100).toFixed(1) : '0.0';
            const profitClass = stats.profit >= 0 ? 'positive-profit' : 'negative-profit';

            html += `
                <div class="scoreboard-item">
                    <div class="scoreboard-rank">${medalImg}</div>
                    <div class="scoreboard-model-name">${modelName}</div>
                    <div class="scoreboard-stats">
                        <span class="scoreboard-accuracy">${accuracy}%</span>
                        <span class="scoreboard-record">(${stats.correct}/${stats.total})</span>
                        <div class="betting-stats">
                            <span class="betting-record">Bets: ${stats.betting_wins}/${totalBets}</span>
                            <span class="profit ${profitClass}">$${stats.profit.toFixed(0)}</span>
                        </div>
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
            const { bestModelName, correct, total, betting_wins, betting_losses, profit } = calculateEventBestModel(event);
            const bestModelInfo = total > 0 ? `<strong>Best Model:</strong> ${bestModelName} (${correct}/${total})` : '';
            const totalBets = betting_wins + betting_losses;
            const bettingInfo = totalBets > 0 ? `<strong>Betting:</strong> ${betting_wins}/${totalBets} bets won, $${profit.toFixed(0)} profit` : '';

            html += `<div class="event-card past-event-card">
                <h3 class="collapsible-header" data-target="event-${event.event_name.replace(/\s+/g, '-')}">${event.event_name}</h3>
                <div class="event-meta">
                    <p class="event-date">${event.event_date}</p>`;
            if (bestModelInfo) {
                html += `<p class="best-model">${bestModelInfo}</p>`;
            }
            if (bettingInfo) {
                html += `<p class="betting-summary">${bettingInfo}</p>`;
            }
            html += `</div>
                <div id="event-${event.event_name.replace(/\s+/g, '-')}" class="past-fights-container collapsible-content">`;
            
            event.results.forEach((fight, index) => {
                const actualWinner = fight.winner;
                const fightId = `${event.event_name.replace(/\s+/g, '-')}-fight-${index}`;
                
                // Calculate model accuracy for this specific fight
                let correct_predictions = 0;
                let total_predictions = 0;
                let total_betting_wins = 0;
                let total_betting_losses = 0;
                let total_profit = 0;
                
                if (fight.predictions && Object.keys(fight.predictions).length > 0) {
                    total_predictions = Object.keys(fight.predictions).length;
                    for (const model in fight.predictions) {
                        if (fight.predictions[model].winner === actualWinner) {
                            correct_predictions++;
                        }
                        
                        // Calculate betting results for each model
                        const betResult = calculateBetResult(fight, fight.predictions[model].winner);
                        if (betResult.wagered) {
                            if (betResult.won) {
                                total_betting_wins++;
                                total_profit += betResult.profit;
                            } else {
                                total_betting_losses++;
                                total_profit -= betResult.wagered;
                            }
                        }
                    }
                }
                
                // Display odds if available
                let oddsHtml = '';
                if (fight.odds && fight.odds.fighter1 && fight.odds.fighter2) {
                    const f1_odds = fight.odds.fighter1.odds;
                    const f2_odds = fight.odds.fighter2.odds;
                    oddsHtml = `
                        <div class="odds-display">
                            <strong>Odds:</strong> ${fight.odds.fighter1.name} ${f1_odds}, ${fight.odds.fighter2.name} ${f2_odds}
                        </div>
                    `;
                }
                
                const totalBets = total_betting_wins + total_betting_losses;
                const bettingSummary = totalBets > 0 ? 
                    `<div class="fight-betting-summary">
                        <strong>Betting Results:</strong> ${total_betting_wins}/${totalBets} models won bets, $${total_profit.toFixed(0)} total profit
                    </div>` : '';
                
                html += `<div class="past-fight">
                    <div class="past-fight-info">
                        <h4>${fight.fight.replace('vs.', 'vs. ')}</h4>
                        <p><strong>Actual Winner:</strong> <span class="actual-winner">${actualWinner}</span></p>
                        ${oddsHtml}
                        ${bettingSummary}
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
                        
                        // Calculate individual bet result
                        const betResult = calculateBetResult(fight, predictedWinner);
                        let betInfo = '';
                        if (betResult.wagered > 0) {
                            const betIcon = betResult.won ? '<span class="bet-win">💰</span>' : '<span class="bet-loss">💸</span>';
                            const profitClass = betResult.won ? 'positive-profit' : 'negative-profit';
                            betInfo = ` <span class="bet-result ${profitClass}">${betIcon} $${betResult.profit.toFixed(0) - (betResult.won ? 0 : 100)}</span>`;
                        }
                        
                        html += `<li>${icon} ${modelName}: ${predictedWinner} <span class="probability">(${probability})</span>${betInfo}</li>`;
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
            updateTimestamps();

            // Automatically open the first event card by default
            // const firstEventHeader = pastEventsDiv.querySelector('.event-card:first-child .collapsible-header');
            // if (firstEventHeader) {
            //     firstEventHeader.click();
            // }
        }
    };

    const updateTimestamps = async () => {
        // Update Last Run timestamp
        await updateLastRunTimestamp();
        
        // Update Last Updated timestamp
        await updateLastUpdatedTimestamp();
    };

    const updateLastRunTimestamp = async () => {
        const timestampElement = document.getElementById('last-run-timestamp');
        if (!timestampElement) return;

        try {
            const response = await fetch('data/last_run.json');
            if (response.ok) {
                const data = await response.json();
                if (data.last_run) {
                    const date = new Date(data.last_run);
                                         // Show month, day, and year
                     const formattedDate = date.toLocaleString('en-US', {
                         year: 'numeric',
                         month: 'short',
                         day: 'numeric'
                     });
                    timestampElement.textContent = formattedDate;
                } else {
                    timestampElement.textContent = 'Unknown';
                }
            } else {
                timestampElement.textContent = 'Unknown';
            }
        } catch (error) {
            console.error('Error fetching last run timestamp:', error);
            timestampElement.textContent = 'Unknown';
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
                    day: 'numeric'
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