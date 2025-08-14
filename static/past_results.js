document.addEventListener('DOMContentLoaded', () => {
    const pastEventsDiv = document.getElementById('past-events');

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
            if (pastEventsDiv) {
                pastEventsDiv.innerHTML = '<p class="error">Could not load past results.</p>';
            }
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

    const renderProfitChart = (data) => {
        const chartContainer = document.getElementById('profit-chart');
        if (!chartContainer) {
            console.error('Profit chart container not found');
            return;
        }

        // Filter events to only include those with fighting odds
        const eventsWithOdds = data.filter(event => 
            event.results.some(fight => 
                fight.odds && fight.odds.fighter1 && fight.odds.fighter2
            )
        ).sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
        
        // Calculate final stats for summary
        const scoreboard = calculateAccuracy(data);
        const models = Object.entries(scoreboard).filter(([model]) => model !== 'Odds Favorite')
            .sort(([, a], [, b]) => {
                const accuracyA = a.total > 0 ? a.correct / a.total : 0;
                const accuracyB = b.total > 0 ? b.correct / b.total : 0;
                return accuracyB - accuracyA;
            });
        
        const bestModelName = models.length > 0 ? models[0][0] : null;
        const bestModelStats = bestModelName ? models[0][1] : { correct: 0, total: 0, profit: 0 };
        
        // Calculate cumulative profits and accuracy using fight-by-fight calculation
        let cumulativeOddsFavoriteProfit = 0;
        let cumulativeBestModelProfit = 0;
        let cumulativeOddsFavoriteInvested = 0;
        let cumulativeBestModelInvested = 0;
        
        const labels = [];
        const oddsFavoriteData = [];
        const bestModelData = [];
        
        eventsWithOdds.forEach(event => {
            // Calculate profits using the same method as detailed breakdown
            let eventOddsProfit = 0;
            let eventModelProfit = 0;
            let eventOddsInvested = 0;
            let eventModelInvested = 0;
            let eventOddsCorrect = 0;
            let eventOddsTotal = 0;
            let eventModelCorrect = 0;
            let eventModelTotal = 0;
            
            event.results.forEach(fight => {
                if (fight.odds && fight.predictions) {
                    // Odds Favorite calculation
                    const actualWinner = fight.winner;
                    const oddsFavoritePrediction = fight.odds.fighter1.odds < fight.odds.fighter2.odds ? 
                        fight.odds.fighter1.name : fight.odds.fighter2.name;
                    
                    const oddsBet = calculateBetResult(fight, oddsFavoritePrediction);
                    eventOddsProfit += oddsBet.profit;
                    eventOddsInvested += oddsBet.wagered;
                    eventOddsTotal++;
                    if (oddsFavoritePrediction === actualWinner) {
                        eventOddsCorrect++;
                    }
                    
                    // Best Model calculation
                    const bestModelPrediction = fight.predictions[bestModelName]?.winner;
                    if (bestModelPrediction) {
                        const modelBet = calculateBetResult(fight, bestModelPrediction);
                        eventModelProfit += modelBet.profit;
                        eventModelInvested += modelBet.wagered;
                        eventModelTotal++;
                        if (bestModelPrediction === actualWinner) {
                            eventModelCorrect++;
                        }
                    }
                }
            });
            
            // Update cumulative profits and invested amounts
            cumulativeOddsFavoriteProfit += eventOddsProfit;
            cumulativeBestModelProfit += eventModelProfit;
            cumulativeOddsFavoriteInvested += eventOddsInvested;
            cumulativeBestModelInvested += eventModelInvested;
            
            // Calculate percentage gains
            const oddsPercentageGain = cumulativeOddsFavoriteInvested > 0 ? 
                ((cumulativeOddsFavoriteProfit / cumulativeOddsFavoriteInvested) * 100) : 0;
            const modelPercentageGain = cumulativeBestModelInvested > 0 ? 
                ((cumulativeBestModelProfit / cumulativeBestModelInvested) * 100) : 0;
            
            labels.push(event.event_name);
            oddsFavoriteData.push(oddsPercentageGain);
            bestModelData.push(modelPercentageGain);
            
            // Update scoreboards
            if (!scoreboard['Odds Favorite']) {
                scoreboard['Odds Favorite'] = { correct: 0, total: 0 };
            }
            scoreboard['Odds Favorite'].correct += eventOddsCorrect;
            scoreboard['Odds Favorite'].total += eventOddsTotal;
            
            if (!bestModelStats.total) {
                bestModelStats = { correct: 0, total: 0 };
            }
            bestModelStats.correct += eventModelCorrect;
            bestModelStats.total += eventModelTotal;
        });

        // Store event data for detailed breakdown
        const eventDetails = [];
        eventsWithOdds.forEach((event, index) => {
            const eventStats = calculateEventStats(event);
            const oddsFavoriteEvent = eventStats['Odds Favorite'] || { profit: 0, invested: 0, correct: 0, total: 0 };
            const bestModelEvent = bestModelName && eventStats[bestModelName] ? 
                eventStats[bestModelName] : { profit: 0, invested: 0, correct: 0, total: 0 };
            
            // Calculate individual fight details
            const fightDetails = [];
            event.results.forEach(fight => {
                if (fight.odds && fight.predictions) {
                    const actualWinner = fight.winner;
                    const oddsFavoritePrediction = fight.odds.fighter1.odds < fight.odds.fighter2.odds ? 
                        fight.odds.fighter1.name : fight.odds.fighter2.name;
                    const bestModelPrediction = fight.predictions[bestModelName]?.winner;
                    
                    const oddsBet = calculateBetResult(fight, oddsFavoritePrediction);
                    const modelBet = bestModelPrediction ? calculateBetResult(fight, bestModelPrediction) : null;
                    
                    // Calculate percentage gains
                    const oddsPercentage = oddsBet.wagered > 0 ? (oddsBet.profit / oddsBet.wagered) * 100 : 0;
                    const modelPercentage = modelBet && modelBet.wagered > 0 ? (modelBet.profit / modelBet.wagered) * 100 : 0;
                    
                    fightDetails.push({
                        fight: fight.fight,
                        actualWinner: actualWinner,
                        oddsFavorite: {
                            prediction: oddsFavoritePrediction,
                            result: oddsFavoritePrediction === actualWinner ? 'WIN' : 'LOSS',
                            amount: oddsBet.wagered,
                            profit: oddsBet.profit,
                            percentage: oddsPercentage
                        },
                        bestModel: {
                            prediction: bestModelPrediction || 'N/A',
                            result: bestModelPrediction === actualWinner ? 'WIN' : 'LOSS',
                            amount: modelBet?.wagered || 0,
                            profit: modelBet?.profit || 0,
                            percentage: modelPercentage
                        }
                    });
                }
            });
            
            eventDetails.push({
                eventName: event.event_name,
                eventDate: event.event_date,
                cumulativeOddsProfit: oddsFavoriteData[index],
                cumulativeModelProfit: bestModelData[index],
                fights: fightDetails
            });
        });

        // Create interactive chart with detailed breakdown
        const ctx = chartContainer.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Odds Favorite',
                        data: oddsFavoriteData,
                        borderColor: '#2ed573',
                        backgroundColor: 'rgba(46, 213, 115, 0.1)',
                        borderWidth: 4,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#2ed573',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'My Predictions',
                        data: bestModelData,
                        borderColor: '#ff4757',
                        backgroundColor: 'rgba(255, 71, 87, 0.1)',
                        borderWidth: 4,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#ff4757',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#ffffff',
                            font: {
                                size: window.innerWidth < 768 ? 14 : 16,
                                family: 'Roboto',
                                weight: 'bold'
                            },
                            usePointStyle: true,
                            padding: window.innerWidth < 768 ? 15 : 25
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#333',
                        borderWidth: 1,
                        cornerRadius: 8,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.parsed.y;
                                const sign = value >= 0 ? '+' : '';
                                return `${label}: ${sign}${value.toFixed(1)}%`;
                            }
                        }
                    }
                },
                onHover: (event, activeElements) => {
                    event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
                },
                onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        showEventDetails(eventDetails[index]);
                    }
                },
                scales: {
                    x: {
                        display: true,
                        ticks: {
                            color: '#ffffff',
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12,
                                family: 'Roboto'
                            },
                            maxRotation: 45,
                            minRotation: 45,
                            callback: function(value, index) {
                                const date = new Date(eventsWithOdds[index].event_date);
                                return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        }
                    },
                    y: {
                        ticks: {
                            color: '#ffffff',
                            font: {
                                size: window.innerWidth < 768 ? 12 : 14,
                                family: 'Roboto'
                            },
                            callback: function(value) {
                                const sign = value >= 0 ? '+' : '';
                                return sign + value.toFixed(0) + '%';
                            }
                        },
                        grid: {
                            color: function(context) {
                                return context.tick.value === 0 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)';
                            },
                            lineWidth: function(context) {
                                return context.tick.value === 0 ? 2 : 1;
                            },
                            drawBorder: false
                        },
                        border: {
                            display: false
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                }
            }
        });

        // Helper function to calculate bet result for individual fights
        function calculateBetResult(fight, predictedWinner) {
            const actualWinner = fight.winner;
            const isCorrect = predictedWinner === actualWinner;
            
            if (!fight.odds) return { wagered: 0, won: false, profit: 0 };
            
            const fighter = fight.odds.fighter1.name === predictedWinner ? 
                fight.odds.fighter1 : fight.odds.fighter2;
            
            const wagered = 100; // Standard $100 bet
            let profit = 0;
            
            if (isCorrect) {
                if (fighter.odds < 0) {
                    // Favorite - need to bet more to win $100
                    profit = (100 / Math.abs(fighter.odds)) * 100;
                } else {
                    // Underdog - win more than bet
                    profit = (fighter.odds / 100) * 100;
                }
            } else {
                profit = -wagered;
            }
            
            return {
                wagered: wagered,
                won: isCorrect,
                profit: profit
            };
        }

        // Function to show detailed event breakdown
        function showEventDetails(eventData) {
            const container = document.getElementById('profit-chart-container');
            let detailsContainer = container.querySelector('.event-details');
            
            if (!detailsContainer) {
                detailsContainer = document.createElement('div');
                detailsContainer.className = 'event-details';
                detailsContainer.style.cssText = `
                    margin-top: 30px;
                    background: rgba(20, 20, 20, 0.6);
                    border-radius: 12px;
                    padding: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    max-width: 100%;
                    overflow-x: auto;
                `;
                container.appendChild(detailsContainer);
            }

            const fightRows = eventData.fights.map(fight => `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">${fight.fight}</td>
                    <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: center;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                            <span style="color: ${fight.oddsFavorite.result === 'WIN' ? '#2ed573' : '#ff4757'}; font-weight: bold;">
                                ${fight.oddsFavorite.result}
                            </span>
                            <span style="color: ${fight.oddsFavorite.percentage >= 0 ? '#2ed573' : '#ff4757'}; font-size: 12px;">
                                ${fight.oddsFavorite.percentage >= 0 ? '+' : ''}${fight.oddsFavorite.percentage.toFixed(1)}%
                            </span>
                        </div>
                    </td>
                    <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: center;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                                        <span style="color: ${fight.bestModel.result === 'WIN' ? '#2ed573' : '#ff4757'}; font-weight: bold;">
                                            ${fight.bestModel.result}
                                        </span>
                                        <span style="color: ${fight.bestModel.percentage >= 0 ? '#2ed573' : '#ff4757'}; font-size: 12px;">
                                            ${fight.bestModel.percentage >= 0 ? '+' : ''}${fight.bestModel.percentage.toFixed(1)}%
                                        </span>
                                    </div>
                    </td>
                </tr>
            `).join('');

            detailsContainer.innerHTML = `
                <h3 style="color: #ffffff; margin: 0 0 15px 0; font-size: 18px;">${eventData.eventName}</h3>
                <p style="color: #cccccc; margin: 0 0 15px 0; font-size: 14px;">${eventData.eventDate}</p>
                
                <div style="overflow-x: auto;">
                    <table style="width: 100%; color: #ffffff; font-size: 14px;">
                        <thead>
                            <tr style="border-bottom: 2px solid rgba(255,255,255,0.2);">
                                <th style="padding: 10px 8px; text-align: left;">Fight</th>
                                <th style="padding: 10px 8px; text-align: center;">Odds Favorite</th>
                                <th style="padding: 10px 8px; text-align: center;">My Predictions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${fightRows}
                        </tbody>
                        <tfoot>
                            <tr style="border-top: 2px solid rgba(255,255,255,0.2);">
                                <td style="padding: 12px 8px; font-weight: bold;">Event Totals</td>
                                <td style="padding: 12px 8px; text-align: center; font-weight: bold;">
                                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                                        ${(() => {
                                            const totalOddsProfit = eventData.fights.reduce((sum, f) => sum + f.oddsFavorite.profit, 0);
                                            const totalOddsInvested = eventData.fights.reduce((sum, f) => sum + f.oddsFavorite.amount, 0);
                                            const oddsPercentage = totalOddsInvested > 0 ? (totalOddsProfit / totalOddsInvested) * 100 : 0;
                                            return `<span style="color: ${oddsPercentage >= 0 ? '#2ed573' : '#ff4757'};">
                                                ${oddsPercentage >= 0 ? '+' : ''}${oddsPercentage.toFixed(1)}%
                                            </span>`;
                                        })()}
                                    </div>
                                </td>
                                <td style="padding: 12px 8px; text-align: center; font-weight: bold;">
                                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                                        ${(() => {
                                            const totalModelProfit = eventData.fights.reduce((sum, f) => sum + f.bestModel.profit, 0);
                                            const totalModelInvested = eventData.fights.reduce((sum, f) => sum + f.bestModel.amount, 0);
                                            const modelPercentage = totalModelInvested > 0 ? (totalModelProfit / totalModelInvested) * 100 : 0;
                                            return `<span style="color: ${modelPercentage >= 0 ? '#2ed573' : '#ff4757'}">
                                                ${modelPercentage >= 0 ? '+' : ''}${modelPercentage.toFixed(1)}%
                                            </span>`;
                                        })()}
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
            
            detailsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Add summary cards above the chart
        const container = document.getElementById('profit-chart-container');
        const oddsFavoritePercentage = cumulativeOddsFavoriteInvested > 0 ? 
            ((cumulativeOddsFavoriteProfit / cumulativeOddsFavoriteInvested) * 100) : 0;
        const bestModelPercentage = cumulativeBestModelInvested > 0 ? 
            ((cumulativeBestModelProfit / cumulativeBestModelInvested) * 100) : 0;
            
        const oddsFavoriteColor = oddsFavoritePercentage >= 0 ? '#2ed573' : '#ff4757';
        const oddsFavoriteBg = oddsFavoritePercentage >= 0 ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 71, 87, 0.1)';
        const oddsFavoriteBorder = oddsFavoritePercentage >= 0 ? 'rgba(46, 213, 115, 0.3)' : 'rgba(255, 71, 87, 0.3)';
        
        const bestModelColor = bestModelPercentage >= 0 ? '#2ed573' : '#ff4757';
        const bestModelBg = bestModelPercentage >= 0 ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 71, 87, 0.1)';
        const bestModelBorder = bestModelPercentage >= 0 ? 'rgba(46, 213, 115, 0.3)' : 'rgba(255, 71, 87, 0.3)';
        
        const summaryHTML = `
            <div style="display: flex; justify-content: space-around; margin-bottom: 30px; gap: 20px; flex-wrap: wrap;">
                <div style="background: ${oddsFavoritePercentage >= 0 ? 'linear-gradient(135deg, rgba(46, 213, 115, 0.15), rgba(46, 213, 115, 0.05))' : 'linear-gradient(135deg, rgba(255, 71, 87, 0.15), rgba(255, 71, 87, 0.05))'}; border: 1px solid ${oddsFavoritePercentage >= 0 ? 'rgba(46, 213, 115, 0.4)' : 'rgba(255, 71, 87, 0.4)'}; border-radius: 12px; padding: 20px; text-align: center; min-width: 150px; flex: 1; max-width: 250px;">
                    <h3 style="color: ${oddsFavoritePercentage >= 0 ? '#2ed573' : '#ff4757'}; margin: 0 0 10px 0; font-size: 18px;">Odds Favorite</h3>
                    <div style="color: #ffffff; font-size: 24px; font-weight: bold; margin-bottom: 5px;">
                        ${oddsFavoritePercentage >= 0 ? '+' : ''}${oddsFavoritePercentage.toFixed(1)}%
                    </div>
                    <div style="color: #cccccc; font-size: 14px;">
                        ${scoreboard['Odds Favorite'] ? Math.round((scoreboard['Odds Favorite'].correct / scoreboard['Odds Favorite'].total) * 100) : 0}% Accuracy
                    </div>
                </div>
                
                <div style="background: ${bestModelPercentage >= 0 ? 'linear-gradient(135deg, rgba(46, 213, 115, 0.15), rgba(46, 213, 115, 0.05))' : 'linear-gradient(135deg, rgba(255, 71, 87, 0.15), rgba(255, 71, 87, 0.05))'}; border: 1px solid ${bestModelPercentage >= 0 ? 'rgba(46, 213, 115, 0.4)' : 'rgba(255, 71, 87, 0.4)'}; border-radius: 12px; padding: 20px; text-align: center; min-width: 150px; flex: 1; max-width: 250px;">
                    <h3 style="color: ${bestModelPercentage >= 0 ? '#2ed573' : '#ff4757'}; margin: 0 0 10px 0; font-size: 18px;">My Predictions</h3>
                    <div style="color: #ffffff; font-size: 24px; font-weight: bold; margin-bottom: 5px;">
                        ${bestModelPercentage >= 0 ? '+' : ''}${bestModelPercentage.toFixed(1)}%
                    </div>
                    <div style="color: #cccccc; font-size: 14px;">
                        ${bestModelStats.total > 0 ? Math.round((bestModelStats.correct / bestModelStats.total) * 100) : 0}% Accuracy
                    </div>
                </div>
            </div>
        `;
        
        // Insert summary cards
        if (!container.querySelector('.summary-cards')) {
            container.insertAdjacentHTML('afterbegin', `<div class="summary-cards">${summaryHTML}</div>`);
        }
        
        // Add instruction text
        const instruction = document.createElement('p');
        instruction.style.cssText = 'text-align: center; color: #cccccc; margin: 15px 0; font-size: 14px;';
        instruction.textContent = 'Click on any point!';
        if (!container.querySelector('p')) {
            container.insertBefore(instruction, container.querySelector('#profit-chart').nextSibling);
        }
    };

    const calculateEventStats = (event) => {
        const modelStats = {};
        
        event.results.forEach(fight => {
            if (!fight.odds || !fight.odds.fighter1 || !fight.odds.fighter2) {
                return; // Skip fights without odds
            }

            const actualWinner = fight.winner;

            // Add "Odds Favorite" baseline
            const favoriteModelName = 'Odds Favorite';
            if (!modelStats[favoriteModelName]) {
                modelStats[favoriteModelName] = { 
                    profit: 0, 
                    invested: 0, 
                    correct: 0, 
                    total: 0 
                };
            }

            const odds1 = fight.odds.fighter1.odds;
            const odds2 = fight.odds.fighter2.odds;
            const favorite = odds1 < odds2 ? fight.odds.fighter1.name : fight.odds.fighter2.name;
            
            modelStats[favoriteModelName].total++;
            if (favorite === actualWinner) {
                modelStats[favoriteModelName].correct++;
            }

            const betResult = calculateBetResult(fight, favorite);
            if (betResult.wagered) {
                modelStats[favoriteModelName].invested += betResult.wagered;
                if (betResult.won) {
                    modelStats[favoriteModelName].profit += betResult.profit;
                } else {
                    modelStats[favoriteModelName].profit -= betResult.wagered;
                }
            }

            if (fight.predictions && Object.keys(fight.predictions).length > 0) {
                for (const model in fight.predictions) {
                    if (!modelStats[model]) {
                        modelStats[model] = { 
                            profit: 0, 
                            invested: 0, 
                            correct: 0, 
                            total: 0 
                        };
                    }
                    
                    const prediction = fight.predictions[model];
                    modelStats[model].total++;
                    if (prediction.winner === actualWinner) {
                        modelStats[model].correct++;
                    }

                    const betResult = calculateBetResult(fight, prediction.winner);
                    if (betResult.wagered) {
                        modelStats[model].invested += betResult.wagered;
                        if (betResult.won) {
                            modelStats[model].profit += betResult.profit;
                        } else {
                            modelStats[model].profit -= betResult.wagered;
                        }
                    }
                }
            }
        });
        
        return modelStats;
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
            const bettingInfo = hasBets ? `<strong>Event Betting:</strong> <span class="${totalEventProfit > 0 ? 'betting-profit-positive' : 'betting-profit-negative'}">${totalEventProfit.toFixed(0)}</span> (Top: ${bestBettingModel} <span class="${topModelProfit > 0 ? 'betting-profit-positive' : 'betting-profit-negative'}">${topModelProfit.toFixed(0)}</span>)` : '';


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
                                <span class="betting-stat-value ${profitClass}">${total_profit.toFixed(0)}</span>
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
                            betInfo = `<div class="betting-info"><span class="model-betting-result ${profitClass}"><span class="betting-profit-display">${netProfit.toFixed(0)}</span></span></div>`;
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
            renderProfitChart(pastResultsData);
            if (pastEventsDiv) {
                renderPastEvents(pastResultsData);
                addCollapsibleListeners();
            }
            updateTimestamps();

            // Automatically open the first event card by default
            // const firstEventHeader = pastEventsDiv?.querySelector('.event-card:first-child .collapsible-header');
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