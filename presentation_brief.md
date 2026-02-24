# Hackathon Presentation: Hyperlocal AQI & Smart Sprinkler System

### 1. Problem Statement
*   **The Problem:** Ambient air quality varies drastically block-by-block, yet existing monitoring (official stations) is sparse, providing only regional averages.
*   **Hyperlocal Importance:** A single construction site or heavy traffic junction can create a "toxicity island" that official stations 10km away miss entirely.
*   **Limitations:** Centralized systems are **reactive**, not proactive. They tell you the air *was* bad, but do nothing to fix it in real-time.

### 2. Solution Overview
*   **Networked Intelligence:** A mesh of low-cost ESP32 sensor nodes providing real-time, street-level AQI data.
*   **Firebase Integration:** Live streaming of PM2.5, Humidity, and Temperature to a central cloud database.
*   **AI Forecasting:** 30-minute predictive windows using ML (Linear Regression with Lags) and Gemini AI to anticipate spikes.
*   **Automated Mitigation:** Smart water-misting sprinklers that trigger automatically when AQI thresholds are breached.
*   **Human-in-the-Loop:** A command center portal for manual overrides and historical trend analysis.
*   **Core Value Proposition:** *Transforming AQI monitoring from a passive data-gathering exercise into an active, automated pollutant-suppression system.*
*   **Differentiation:** Traditional systems monitor; our system **intervenes**.

### 3. System Architecture
*   **Hardware Layer:** ESP32 Microcontrollers, PM2.5 Optical Sensors, DHT22 (Humidity/Temp), and 5V Relay Modules for sprinkler valves.
*   **Cloud Layer:** Firebase Realtime Database for sub-second latency data streaming and control commands.
*   **ML Layer:** Hybrid model combining stored Linear Regression weights (Firebase) with Google Gemini AI for reasoning.
*   **Portal Layer:** React/Vite Dashboard featuring Recharts for historical/forecast visualization and zone-based control UI.
*   **Data Flow:** `Sensor` → `ESP32` → `Firebase` → `ML Model (Weights/AI)` → `UI Dashboard` → `Actuator (Sprinkler Relay)`.

### 4. AI / ML Layer
*   **Model Type:** Multivariate Linear Regression with Lagged Features.
*   **Features:** Current AQI, AQI Lag-1, Lag-2, Lag-3 (historical momentum), Humidity, and Temperature.
*   **Weights & Intercept:** Calculated externally to minimize edge-compute load, stored in Firebase (`ml_models/aqi_model`).
*   **Selection Rationale:** Linear Regression offers high interpretability and minimal latency, essential for real-time edge triggers.
*   **Rolling Forecast:** Generates 6 points (5-min intervals) to show the next 30 minutes of air quality trends.
*   **Manual Mode Exclusion:** Manual sprinkler activations are excluded from training to avoid "feedback loop" bias in the pollution model.

### 5. Control Logic
*   **Activation Triggers:** Triggered when `AQI > Threshold` (customizable, default 200) AND `Humidity < 80%` (to ensure effectiveness).
*   **Real-time Logic:** Frontend subscribes to `nodes/Node1` via Firebase `onValue`, reacting instantly to sensor spikes.
*   **Firebase Path:** `nodes/{nodeId}/sprinklerActive` (boolean) triggers the physical relay via ESP32 listener.
*   **Safety Fallback:** Auto-stop timers (e.g., 5-min cycles) to prevent water wastage and over-saturation.

### 6. Deployment Model
*   **Density:** 4–6 nodes per residential colony (Market, Park, Entry, Residential Block).
*   **Requirements:** Standard 5V power (micro-USB/Solar) and 2.4GHz Wi-Fi/LoRa coverage.
*   **Scalability:** Horizontal scaling via Firebase; new nodes are auto-discovered by the dashboard upon registration.
*   **Cost Efficiency:** Estimated hardware cost ~$40/node; Cloud costs minimal due to efficient serialized data packets.

### 7. Impact & KPIs
*   **Pollution Reduction:** Targeted 15–30% reduction in local PM2.5 levels during activation cycles.
*   **Response Time:** Measurement of "Time to Mitigation" (interval between AQI spike and sprinkler trigger).
*   **Predictive Accuracy:** Difference between the AI's 30-min forecast and actual sensors.
*   **Proactive Mitigation:** AI allows the system to trigger *before* the peak is reached, smoothing the pollution curve.

### 8. Pilot Plan
*   **Phase 1 (2 Weeks):** Passive Data Gathering to refine ML weights and calibrate local baseline.
*   **Phase 2 (2 Weeks):** "Shadow Mode" triggers (log activations without physical water release).
*   **Phase 3 (1 Month):** Full automated rollout with 4 active nodes in a controlled residential zone.
*   **Success Criteria:** Consistent reduction of neighborhood PM2.5 below dangerous levels during peak rush hours.

### 9. Differentiation
*   **Proactive vs Reactive:** We use 30-min AI forecasts to trigger misting *before* air becomes severely toxic.
*   **Deployability:** Low-cost hardware and standardized cloud architecture allow for community-wide setup in under 2 weeks.
*   **Scale:** Centralized "City Command Center" view can manage thousands of colonies from a single unified portal.

### 10. 60-Second Executive Summary
"Air pollution isn't just a city-wide problem; it's a street-level crisis. Presenting MistMinds: the first hyperlocal 'Breathe-as-a-Service' platform. We deploy a network of intelligent sensors that don't just tell you the air is bad—they fix it. By combining real-time IoT data with AI-powered trend forecasting, our system proactively activates smart water-misting sprinklers to suppress airborne pollutants at the source. It’s decentralized, automated, and effective. We’re moving beyond monitoring toward autonomous environmental care—bringing clean air back to the neighborhood, one colony at a time."
