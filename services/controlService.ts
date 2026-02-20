/**
 * Pure decision logic for sprinkler activation.
 * Returns true if activation criteria are met, false otherwise.
 * 
 * Rule: (Current_AQI > 200 OR Forecast_Peak > 200) AND (Humidity < 80)
 */
export function shouldActivateSprinkler(
    currentAQI: number,
    forecastPeak: number,
    humidity: number
): boolean {
    const meetsAqiCriteria = currentAQI > 150 || forecastPeak > 150;
    const meetsHumidityCriteria = humidity < 80;

    return meetsAqiCriteria && meetsHumidityCriteria;
}
