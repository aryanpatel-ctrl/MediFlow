"""
MediFlow - ML Service API
Provides no-show prediction, duration estimation, and queue optimization.
Features aligned with training data (v2.0)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os
import json
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Load models
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

# Feature configuration
NO_SHOW_FEATURES = [
    'age', 'gender', 'totalAppointments', 'noShowCount', 'cancelledCount',
    'noShowRate', 'urgencyScore', 'symptomsCount', 'hasRedFlags',
    'dayOfWeek', 'hour', 'isWeekend', 'daysUntilAppointment', 'smsReceived'
]

DURATION_FEATURES = [
    'age', 'gender', 'urgencyScore', 'symptomsCount',
    'hasRedFlags', 'dayOfWeek', 'hour', 'isWeekend'
]

try:
    no_show_model = joblib.load(os.path.join(MODEL_DIR, 'no_show_model.pkl'))
    duration_model = joblib.load(os.path.join(MODEL_DIR, 'duration_model.pkl'))
    print("Models loaded successfully!")
    print(f"No-show model features: {NO_SHOW_FEATURES}")
    print(f"Duration model features: {DURATION_FEATURES}")
except Exception as e:
    print(f"Warning: Could not load models - {e}")
    no_show_model = None
    duration_model = None


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'version': '2.0',
        'models_loaded': {
            'no_show': no_show_model is not None,
            'duration': duration_model is not None
        },
        'features': {
            'no_show': NO_SHOW_FEATURES,
            'duration': DURATION_FEATURES
        }
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict no-show probability and consultation duration.

    Expected input features (aligned with training):
    - age: Patient age (0-100)
    - gender: 0 = female, 1 = male
    - totalAppointments: Total past appointments
    - noShowCount: Number of past no-shows
    - cancelledCount: Number of cancellations
    - noShowRate: Historical no-show percentage
    - urgencyScore: 1-5 urgency level
    - symptomsCount: Number of symptoms reported
    - hasRedFlags: 1 if critical symptoms, 0 otherwise
    - dayOfWeek: 0-6 (Monday-Sunday)
    - hour: Hour of appointment (0-23)
    - isWeekend: 1 if weekend, 0 otherwise
    - daysUntilAppointment: Days between booking and appointment
    - smsReceived: 1 if SMS reminder sent, 0 otherwise
    """
    try:
        data = request.json

        # Extract features for no-show prediction (14 features)
        no_show_features = [
            data.get('age', 30),
            data.get('gender', 0),
            data.get('totalAppointments', 0),
            data.get('noShowCount', 0),
            data.get('cancelledCount', 0),
            data.get('noShowRate', 0),
            data.get('urgencyScore', 3),
            data.get('symptomsCount', 1),
            data.get('hasRedFlags', 0),
            data.get('dayOfWeek', 0),
            data.get('hour', 10),
            data.get('isWeekend', 0),
            data.get('daysUntilAppointment', 1),
            data.get('smsReceived', 0)
        ]

        # Extract features for duration prediction (8 features)
        duration_features = [
            data.get('age', 30),
            data.get('gender', 0),
            data.get('urgencyScore', 3),
            data.get('symptomsCount', 1),
            data.get('hasRedFlags', 0),
            data.get('dayOfWeek', 0),
            data.get('hour', 10),
            data.get('isWeekend', 0)
        ]

        no_show_array = np.array([no_show_features])
        duration_array = np.array([duration_features])

        # No-show prediction
        if no_show_model is not None:
            no_show_prob = float(no_show_model.predict_proba(no_show_array)[0][1])
        else:
            # Fallback: calculate based on historical rate
            base_prob = min(0.5, data.get('noShowRate', 15) / 100)
            # Adjust for SMS reminder
            if data.get('smsReceived', 0):
                base_prob *= 0.7
            # Adjust for days until appointment
            days = data.get('daysUntilAppointment', 1)
            if days > 14:
                base_prob *= 1.3
            no_show_prob = min(0.9, max(0.05, base_prob))

        # Duration prediction
        if duration_model is not None:
            predicted_duration = int(duration_model.predict(duration_array)[0])
        else:
            # Fallback: estimate based on urgency and symptoms
            base_duration = 15
            urgency = data.get('urgencyScore', 3)
            symptoms = data.get('symptomsCount', 1)
            predicted_duration = base_duration + (urgency - 3) * 3 + symptoms * 2

        # Clamp duration to reasonable range
        predicted_duration = max(10, min(45, predicted_duration))

        return jsonify({
            'success': True,
            'no_show_probability': round(no_show_prob, 4),
            'predicted_duration': predicted_duration,
            'risk_level': get_risk_level(no_show_prob),
            'confidence': 'high' if no_show_model is not None else 'fallback'
        })

    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'no_show_probability': 0.15,
            'predicted_duration': 15,
            'risk_level': 'low',
            'confidence': 'error'
        }), 500


@app.route('/predict-wait-time', methods=['POST'])
def predict_wait_time():
    """
    ML-enhanced wait time prediction considering no-show probabilities.
    """
    try:
        data = request.json
        queue_entries = data.get('queueEntries', [])
        avg_consultation_time = data.get('avgConsultationTime', 15)
        current_delay = data.get('currentDelay', 0)

        wait_times = []
        cumulative_time = current_delay

        for entry in queue_entries:
            # Predict no-show probability for this patient
            no_show_features = [
                entry.get('age', 30),
                entry.get('gender', 0),
                entry.get('totalAppointments', 0),
                entry.get('noShowCount', 0),
                entry.get('cancelledCount', 0),
                entry.get('noShowRate', 0),
                entry.get('urgencyScore', 3),
                entry.get('symptomsCount', 1),
                entry.get('hasRedFlags', 0),
                entry.get('dayOfWeek', 0),
                entry.get('hour', 10),
                entry.get('isWeekend', 0),
                entry.get('daysUntilAppointment', 0),
                entry.get('smsReceived', 1)
            ]

            if no_show_model is not None:
                no_show_prob = float(no_show_model.predict_proba(np.array([no_show_features]))[0][1])
            else:
                no_show_prob = entry.get('noShowRate', 15) / 100

            # Predict duration
            duration_features = [
                entry.get('age', 30),
                entry.get('gender', 0),
                entry.get('urgencyScore', 3),
                entry.get('symptomsCount', 1),
                entry.get('hasRedFlags', 0),
                entry.get('dayOfWeek', 0),
                entry.get('hour', 10),
                entry.get('isWeekend', 0)
            ]

            if duration_model is not None:
                predicted_duration = int(duration_model.predict(np.array([duration_features]))[0])
            else:
                predicted_duration = avg_consultation_time

            predicted_duration = max(10, min(45, predicted_duration))

            # Adjust wait time based on no-show probability
            # If patient ahead is likely to no-show, reduce expected wait
            adjusted_duration = predicted_duration * (1 - no_show_prob * 0.8)

            wait_times.append({
                'entryId': entry.get('id'),
                'estimatedWait': round(cumulative_time),
                'noShowProbability': round(no_show_prob, 4),
                'predictedDuration': predicted_duration,
                'adjustedDuration': round(adjusted_duration)
            })

            cumulative_time += adjusted_duration

        return jsonify({
            'success': True,
            'waitTimes': wait_times,
            'totalExpectedTime': round(cumulative_time)
        })

    except Exception as e:
        print(f"Wait time prediction error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/batch-predict', methods=['POST'])
def batch_predict():
    """
    Batch prediction for multiple appointments.
    """
    try:
        data = request.json
        appointments = data.get('appointments', [])

        predictions = []
        for apt in appointments:
            no_show_features = extract_no_show_features(apt)
            duration_features = extract_duration_features(apt)

            if no_show_model is not None:
                no_show_prob = float(no_show_model.predict_proba(np.array([no_show_features]))[0][1])
            else:
                no_show_prob = 0.15

            if duration_model is not None:
                duration = int(duration_model.predict(np.array([duration_features]))[0])
            else:
                duration = 15

            predictions.append({
                'appointment_id': apt.get('id'),
                'no_show_probability': round(no_show_prob, 4),
                'predicted_duration': max(10, min(45, duration)),
                'risk_level': get_risk_level(no_show_prob)
            })

        return jsonify({
            'success': True,
            'predictions': predictions
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/optimize-queue', methods=['POST'])
def optimize_queue():
    """
    Get optimized queue order based on predictions.
    Considers urgency, no-show probability, and predicted duration.
    """
    try:
        data = request.json
        appointments = data.get('appointments', [])

        scored_appointments = []

        for apt in appointments:
            no_show_features = extract_no_show_features(apt)

            if no_show_model is not None:
                no_show_prob = float(no_show_model.predict_proba(np.array([no_show_features]))[0][1])
            else:
                no_show_prob = 0.15

            urgency = apt.get('urgencyScore', 3)
            checked_in = apt.get('checkedIn', False)

            # Calculate priority score
            # Higher score = higher priority
            score = 0

            # Urgency is primary factor (0-100 points)
            score += urgency * 20

            # Lower no-show probability = higher priority (0-20 points)
            score += (1 - no_show_prob) * 20

            # Already checked in = priority boost (15 points)
            if checked_in:
                score += 15

            # Time waiting boost (up to 10 points)
            wait_minutes = apt.get('waitingMinutes', 0)
            score += min(10, wait_minutes / 6)  # Max 10 points after 60 min wait

            scored_appointments.append({
                'appointment_id': apt.get('id'),
                'score': round(score, 2),
                'urgency': urgency,
                'no_show_probability': round(no_show_prob, 4),
                'checked_in': checked_in,
                'risk_level': get_risk_level(no_show_prob)
            })

        # Sort by score descending
        scored_appointments.sort(key=lambda x: x['score'], reverse=True)

        return jsonify({
            'success': True,
            'optimized_order': scored_appointments
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/high-risk-alerts', methods=['POST'])
def high_risk_alerts():
    """
    Identify appointments with high no-show risk for proactive intervention.
    """
    try:
        data = request.json
        appointments = data.get('appointments', [])
        threshold = data.get('threshold', 0.3)

        high_risk = []

        for apt in appointments:
            no_show_features = extract_no_show_features(apt)

            if no_show_model is not None:
                no_show_prob = float(no_show_model.predict_proba(np.array([no_show_features]))[0][1])
            else:
                no_show_prob = apt.get('noShowRate', 15) / 100

            if no_show_prob >= threshold:
                # Determine intervention recommendations
                interventions = []
                if not apt.get('smsReceived', False):
                    interventions.append('Send SMS reminder')
                if no_show_prob >= 0.5:
                    interventions.append('Make phone call')
                if apt.get('daysUntilAppointment', 0) > 7:
                    interventions.append('Send reminder closer to date')

                high_risk.append({
                    'appointment_id': apt.get('id'),
                    'patient_id': apt.get('patientId'),
                    'no_show_probability': round(no_show_prob, 4),
                    'risk_level': get_risk_level(no_show_prob),
                    'recommended_interventions': interventions
                })

        # Sort by risk level
        high_risk.sort(key=lambda x: x['no_show_probability'], reverse=True)

        return jsonify({
            'success': True,
            'high_risk_count': len(high_risk),
            'appointments': high_risk
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def extract_no_show_features(data):
    """Extract 14 features for no-show prediction"""
    return [
        data.get('age', 30),
        data.get('gender', 0),
        data.get('totalAppointments', 0),
        data.get('noShowCount', 0),
        data.get('cancelledCount', 0),
        data.get('noShowRate', 0),
        data.get('urgencyScore', 3),
        data.get('symptomsCount', 1),
        data.get('hasRedFlags', 0),
        data.get('dayOfWeek', 0),
        data.get('hour', 10),
        data.get('isWeekend', 0),
        data.get('daysUntilAppointment', 1),
        data.get('smsReceived', 0)
    ]


def extract_duration_features(data):
    """Extract 8 features for duration prediction"""
    return [
        data.get('age', 30),
        data.get('gender', 0),
        data.get('urgencyScore', 3),
        data.get('symptomsCount', 1),
        data.get('hasRedFlags', 0),
        data.get('dayOfWeek', 0),
        data.get('hour', 10),
        data.get('isWeekend', 0)
    ]


def get_risk_level(probability):
    """Convert probability to risk level"""
    if probability >= 0.5:
        return 'high'
    elif probability >= 0.3:
        return 'medium'
    return 'low'


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"\nMediFlow ML Service v2.0")
    print(f"Starting on port {port}")
    print(f"Models directory: {MODEL_DIR}")
    app.run(host='0.0.0.0', port=port, debug=True)
