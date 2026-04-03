from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Load models
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

try:
    no_show_model = joblib.load(os.path.join(MODEL_DIR, 'no_show_model.pkl'))
    duration_model = joblib.load(os.path.join(MODEL_DIR, 'duration_model.pkl'))
    print("Models loaded successfully!")
except Exception as e:
    print(f"Warning: Could not load models - {e}")
    no_show_model = None
    duration_model = None


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'models_loaded': {
            'no_show': no_show_model is not None,
            'duration': duration_model is not None
        }
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict no-show probability and consultation duration
    """
    try:
        data = request.json

        # Extract features
        features = [
            data.get('age', 30),
            data.get('gender', 0),  # 0 = female, 1 = male
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
            data.get('recentNoShows', 0),
            data.get('avgPastWaitTime', 15)
        ]

        features_array = np.array([features])

        # Predictions
        if no_show_model:
            no_show_prob = float(no_show_model.predict_proba(features_array)[0][1])
        else:
            # Default prediction based on historical no-show rate
            no_show_prob = min(0.5, data.get('noShowRate', 15) / 100 + 0.05)

        if duration_model:
            predicted_duration = int(duration_model.predict(features_array)[0])
        else:
            # Default duration based on urgency
            urgency = data.get('urgencyScore', 3)
            base_duration = 15
            predicted_duration = base_duration + (urgency - 3) * 3

        return jsonify({
            'success': True,
            'no_show_probability': round(no_show_prob, 4),
            'predicted_duration': max(10, min(45, predicted_duration)),
            'risk_level': get_risk_level(no_show_prob)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'no_show_probability': 0.15,
            'predicted_duration': 15,
            'risk_level': 'low'
        }), 500


@app.route('/batch-predict', methods=['POST'])
def batch_predict():
    """
    Batch prediction for multiple appointments
    """
    try:
        data = request.json
        appointments = data.get('appointments', [])

        predictions = []
        for apt in appointments:
            features = extract_features(apt)
            features_array = np.array([features])

            if no_show_model:
                no_show_prob = float(no_show_model.predict_proba(features_array)[0][1])
            else:
                no_show_prob = 0.15

            if duration_model:
                duration = int(duration_model.predict(features_array)[0])
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
    Get optimized queue order based on predictions
    """
    try:
        data = request.json
        appointments = data.get('appointments', [])

        scored_appointments = []

        for apt in appointments:
            features = extract_features(apt)
            features_array = np.array([features])

            if no_show_model:
                no_show_prob = float(no_show_model.predict_proba(features_array)[0][1])
            else:
                no_show_prob = 0.15

            urgency = apt.get('urgencyScore', 3)

            # Calculate priority score
            # Higher urgency = higher priority
            # Lower no-show probability = higher priority
            score = (urgency * 20) + ((1 - no_show_prob) * 10)

            scored_appointments.append({
                'appointment_id': apt.get('id'),
                'score': round(score, 2),
                'urgency': urgency,
                'no_show_probability': round(no_show_prob, 4)
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


def extract_features(data):
    """Extract features from appointment data"""
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
        data.get('recentNoShows', 0),
        data.get('avgPastWaitTime', 15)
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
    app.run(host='0.0.0.0', port=port, debug=True)
