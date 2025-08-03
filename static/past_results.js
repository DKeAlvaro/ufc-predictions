document.addEventListener('DOMContentLoaded', () => {
    const pastEventsDiv = document.getElementById('past-events');

    if (!pastEventsDiv) {
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
            pastEventsDiv.innerHTML = '<p class="error">Could not load past results.</p>';
            return [];
        }
    };

    const calculateAccuracy = (data) => {
        const scoreboard = {};
        
        data.forEach(event => {
            event.results.forEach(fight => {
                const actualWinner = fight.winner;

                // Add "Odds Favorite" baseline
                if (fight.odds && fight.odds.fighter1 && fight.odds.fighter2) {
                    const favoriteModelName = 'Odds Favorite';
                    if (!scoreboard[favoriteModelName]) {
                        scoreboard[favoriteModelName] = { correct: 0, total: 0, betting_wins: 0, betting_losses: 0, profit: 0 };
                    }

                    const odds1 = fight.odds.fighter1.odds;
                    const odds2 = fight.odds.fighter2.odds;
                    const favorite = odds1 < odds2 ? fight.odds.fighter1.name : fight.odds.fighter2.name;
                    
                    if (favorite === actualWinner) {
                        scoreboard[favoriteModelName].correct++;
                    }
                    scoreboard[favoriteModelName].total++;

                    const betResult = calculateBetResult(fight, favorite);
                    if (betResult.wagered) {
                        if (betResult.won) {
                            scoreboard[favoriteModelName].betting_wins++;
                            scoreboard[favoriteModelName].profit += betResult.profit;
                        } else {
                            scoreboard[favoriteModelName].betting_losses++;
                            scoreboard[favoriteModelName].profit -= betResult.wagered;
                        }
                    }
                }

                if (fight.predictions && Object.keys(fight.predictions).length > 0) {
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

    const calculateEventModelStats = (event) => {
        const modelStats = {};
        event.results.forEach(fight => {
            // Add "Odds Favorite" baseline
            if (fight.odds && fight.odds.fighter1 && fight.odds.fighter2) {
                const favoriteModelName = 'Odds Favorite';
                if (!modelStats[favoriteModelName]) {
                    modelStats[favoriteModelName] = { betting_wins: 0, betting_losses: 0, profit: 0 };
                }
                const odds1 = fight.odds.fighter1.odds;
                const odds2 = fight.odds.fighter2.odds;
                const favorite = odds1 < odds2 ? fight.odds.fighter1.name : fight.odds.fighter2.name;
                const betResult = calculateBetResult(fight, favorite);
                if (betResult.wagered) {
                    if (betResult.won) {
                        modelStats[favoriteModelName].betting_wins++;
                        modelStats[favoriteModelName].profit += betResult.profit;
                    } else {
                        modelStats[favoriteModelName].betting_losses++;
                        modelStats[favoriteModelName].profit -= betResult.wagered;
                    }
                }
            }

            if (fight.predictions && Object.keys(fight.predictions).length > 0) {
                for (const model in fight.predictions) {
                    if (!modelStats[model]) {
                        modelStats[model] = { betting_wins: 0, betting_losses: 0, profit: 0 };
                    }
                    const prediction = fight.predictions[model];
                    const betResult = calculateBetResult(fight, prediction.winner);
                    if (betResult.wagered) {
                        if (betResult.won) {
                            modelStats[model].betting_wins++;
                            modelStats[model].profit += betResult.profit;
                        } else {
                            modelStats[model].betting_losses++;
                            modelStats[model].profit -= betResult.wagered;
                        }
                    }
                }
            }
        });
        return modelStats;
    };

    const calculateEventBestModel = (event) => {
        const scoreboard = {};
        event.results.forEach(fight => {
            const actualWinner = fight.winner;

            // Add "Odds Favorite" baseline
            if (fight.odds && fight.odds.fighter1 && fight.odds.fighter2) {
                const favoriteModelName = 'Odds Favorite';
                if (!scoreboard[favoriteModelName]) {
                    scoreboard[favoriteModelName] = { correct: 0, total: 0, betting_wins: 0, betting_losses: 0, profit: 0 };
                }
                const odds1 = fight.odds.fighter1.odds;
                const odds2 = fight.odds.fighter2.odds;
                const favorite = odds1 < odds2 ? fight.odds.fighter1.name : fight.odds.fighter2.name;
                if (favorite === actualWinner) {
                    scoreboard[favoriteModelName].correct++;
                }
                scoreboard[favoriteModelName].total++;
                const betResult = calculateBetResult(fight, favorite);
                if (betResult.wagered) {
                    if (betResult.won) {
                        scoreboard[favoriteModelName].betting_wins++;
                        scoreboard[favoriteModelName].profit += betResult.profit;
                    } else {
                        scoreboard[favoriteModelName].betting_losses++;
                        scoreboard[favoriteModelName].profit -= betResult.wagered;
                    }
                }
            }

            if (fight.predictions && Object.keys(fight.predictions).length > 0) {
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

    const renderInsightsTable = (scoreboard) => {
        const insightsTableWrapper = document.querySelector('.insights-table-wrapper');
        if (!insightsTableWrapper) {
            console.error('Insights table wrapper not found');
            return;
        }

        const models = Object.entries(scoreboard).sort(([, a], [, b]) => {
            const accuracyA = a.total > 0 ? a.correct / a.total : 0;
            const accuracyB = b.total > 0 ? b.correct / b.total : 0;
            return accuracyB - accuracyA;
        });
        if (models.length === 0) {
            insightsContainer.innerHTML = '<p>No model data to display.</p>';
            return;
        }

        let tableHtml = `
            <table class="insights-table">
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>Predictions</th>
                        <th>Correct</th>
                        <th>Accuracy</th>
                        <th>Bets</th>
                        <th>Wins</th>
                        <th>Win %</th>
                        <th>Profit</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let totalFights = 0;
        let totalCorrect = 0;
        let totalBets = 0;
        let totalBettingWins = 0;
        let totalProfit = 0;

        models.forEach(([model, stats]) => {
            const modelName = model.replace('Model.joblib', '');
            const accuracy = stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) + '%' : 'N/A';
            const totalModelBets = stats.betting_wins + stats.betting_losses;
            const bettingWinRate = totalModelBets > 0 ? ((stats.betting_wins / totalModelBets) * 100).toFixed(1) + '%' : 'N/A';
            const profitClass = stats.profit > 0 ? 'betting-profit-positive' : stats.profit < 0 ? 'betting-profit-negative' : 'betting-profit-neutral';

            tableHtml += `
                <tr>
                    <td>${modelName}</td>
                    <td>${stats.total}</td>
                    <td>${stats.correct}</td>
                    <td>${accuracy}</td>
                    <td>${totalModelBets}</td>
                    <td>${stats.betting_wins}</td>
                    <td>${bettingWinRate}</td>
                    <td class="${profitClass}">${Math.abs(stats.profit).toFixed(0)}</td>
                </tr>
            `;

            totalFights += stats.total;
            totalCorrect += stats.correct;
            totalBets += totalModelBets;
            totalBettingWins += stats.betting_wins;
            totalProfit += stats.profit;
        });

        const numModels = models.length;
        const avgAccuracy = totalFights > 0 ? ((totalCorrect / totalFights) * 100).toFixed(1) + '%' : 'N/A';
        const avgBettingWinRate = totalBets > 0 ? ((totalBettingWins / totalBets) * 100).toFixed(1) + '%' : 'N/A';
        const avgProfitClass = totalProfit > 0 ? 'betting-profit-positive' : totalProfit < 0 ? 'betting-profit-negative' : 'betting-profit-neutral';

        tableHtml += `
                </tbody>
                <tfoot>
                    <tr>
                        <td><strong>Aggregate</strong></td>
                        <td>${(totalFights / numModels).toFixed(0)}</td>
                        <td>${(totalCorrect / numModels).toFixed(0)}</td>
                        <td>${avgAccuracy}</td>
                        <td>${(totalBets / numModels).toFixed(0)}</td>
                        <td>${(totalBettingWins / numModels).toFixed(0)}</td>
                        <td>${avgBettingWinRate}</td>
                        <td class="${avgProfitClass}">${Math.abs(totalProfit).toFixed(0)}</td>
                    </tr>
                </tfoot>
            </table>
        `;

        insightsTableWrapper.innerHTML = tableHtml;
    };

    const renderPastEvents = (data) => {
        if (!data || data.length === 0) {
            pastEventsDiv.innerHTML = '<p>No past event data to display.</p>';
            return;
        }

        let html = '';
        data.forEach(event => {
            const { bestModelName, correct, total } = calculateEventBestModel(event);
            const eventModelStats = calculateEventModelStats(event);

            let bestBettingModel = 'N/A';
            let maxProfit = -Infinity;
            let hasBets = false;
            Object.values(eventModelStats).forEach(stats => {
                if (stats.betting_wins + stats.betting_losses > 0) hasBets = true;
            });

            if (hasBets) {
                for (const model in eventModelStats) {
                    if (eventModelStats[model].profit > maxProfit) {
                        maxProfit = eventModelStats[model].profit;
                        bestBettingModel = model.replace('Model.joblib', '');
                    }
                }
            }

            const bestModelInfo = total > 0 ? `<strong>Best Picker:</strong> ${bestModelName} (${correct}/${total})` : '';
            const totalEventProfit = Object.values(eventModelStats).reduce((acc, stats) => acc + stats.profit, 0);
            const topModelProfit = maxProfit > -Infinity ? maxProfit : 0;
            const bettingInfo = hasBets ? `<strong>Event Betting:</strong> <span class="${totalEventProfit > 0 ? 'betting-profit-positive' : 'betting-profit-negative'}">${Math.abs(totalEventProfit).toFixed(0)}</span> (Top: ${bestBettingModel} <span class="${topModelProfit > 0 ? 'betting-profit-positive' : 'betting-profit-negative'}">${Math.abs(topModelProfit).toFixed(0)}</span>)` : '';


            html += `<div class="event-card past-event-card">
                <h3 class="collapsible-header" data-target="event-${event.event_name.replace(/\s+/g, '-')}">${event.event_name}</h3>
                <div class="event-meta">
                    <p class="event-date">${event.event_date}</p>
                    <div class="event-summaries">
                        ${bestModelInfo ? `<p class="best-model">${bestModelInfo}</p>` : ''}
                        ${bettingInfo ? `<p class="betting-summary">${bettingInfo}</p>` : ''}
                    </div>
                </div>
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
                    const f1_odds = fight.odds.fighter1.odds > 0 ? `+${fight.odds.fighter1.odds}` : fight.odds.fighter1.odds;
                    const f2_odds = fight.odds.fighter2.odds > 0 ? `+${fight.odds.fighter2.odds}` : fight.odds.fighter2.odds;
                    oddsHtml = `
                        <div class="fight-odds">
                            <div class="fight-odds-item">
                                <span class="odds-label">${fight.odds.fighter1.name}:</span>
                                <span class="odds-value">${f1_odds}</span>
                            </div>
                            <div class="fight-odds-item">
                                <span class="odds-label">${fight.odds.fighter2.name}:</span>
                                <span class="odds-value">${f2_odds}</span>
                            </div>
                        </div>
                    `;
                }
                
                const totalBets = total_betting_wins + total_betting_losses;
                const profitClass = total_profit > 0 ? 'betting-profit-positive' : total_profit < 0 ? 'betting-profit-negative' : 'betting-profit-neutral';
                const bettingSummary = totalBets > 0 ? `
                    <div class="fight-betting-summary">
                        <div class="betting-stats">
                            <div class="betting-stat">
                                <span class="betting-stat-label">Total Profit</span>
                                <span class="betting-stat-value ${profitClass}">${Math.abs(total_profit).toFixed(0)}</span>
                            </div>
                            <div class="betting-stat">
                                <span class="betting-stat-label">Winning Bets</span>
                                <span class="betting-stat-value">${total_betting_wins}/${totalBets}</span>
                            </div>
                        </div>
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

                const predictions = { ...fight.predictions };

                // Add Favorite baseline to predictions list
                if (fight.odds && fight.odds.fighter1 && fight.odds.fighter2) {
                    const odds1 = fight.odds.fighter1.odds;
                    const odds2 = fight.odds.fighter2.odds;
                    const favorite = odds1 < odds2 ? fight.odds.fighter1.name : fight.odds.fighter2.name;
                    predictions['Favorite'] = { winner: favorite, probability: 'Favorite' };
                }

                if (Object.keys(predictions).length > 0) {
                    // Sort predictions to maintain consistent order
                    const sortedPredictions = Object.entries(predictions);

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
                            const netProfit = betResult.won ? betResult.profit : -betResult.wagered;

                            const profitClass = netProfit >= 0 ? 'betting-profit-positive' : 'betting-profit-negative';
                            betInfo = `<div class="betting-info"><span class="model-betting-result ${profitClass}"><span class="betting-profit-display">${Math.abs(netProfit).toFixed(0)}</span></span></div>`;
                        }

                        html += `<li><div class="model-info">${icon} <strong>${modelName}:</strong> ${predictedWinner} <span class="probability">(${probability})</span></div>${betInfo}</li>`;
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
            renderInsightsTable(scoreboard);
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