"""
MediFlow - ML Model Training Script
Trains no-show prediction and duration prediction models using the Kaggle dataset.
Features are aligned with runtime data available in the application.
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score, mean_absolute_error
from xgboost import XGBClassifier, XGBRegressor
import joblib
import os

# Paths
DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'noshowappointments.csv')
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

# Create models directory if not exists
os.makedirs(MODEL_DIR, exist_ok=True)

# Feature names that match runtime inference (14 features)
FEATURE_NAMES = [
    'age',
    'gender',                # 0 = female, 1 = male
    'totalAppointments',     # simulated from dataset
    'noShowCount',           # simulated patient history
    'cancelledCount',        # simulated
    'noShowRate',            # calculated rate
    'urgencyScore',          # simulated 1-5
    'symptomsCount',         # simulated
    'hasRedFlags',           # simulated from conditions
    'dayOfWeek',             # 0-6
    'hour',                  # scheduled hour
    'isWeekend',             # 0 or 1
    'daysUntilAppointment',  # days between scheduling and appointment
    'smsReceived'            # whether SMS reminder was sent
]


def load_and_preprocess_data():
    """Load and preprocess the Kaggle no-show appointments dataset"""
    print("Loading dataset...")
    df = pd.read_csv(DATA_PATH)

    print(f"Dataset shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")

    # Rename columns for easier handling
    df.columns = [col.lower().replace('-', '_') for col in df.columns]

    # Convert dates
    df['scheduledday'] = pd.to_datetime(df['scheduledday'])
    df['appointmentday'] = pd.to_datetime(df['appointmentday'])

    # Target variable (1 = no-show, 0 = showed up)
    df['no_show'] = (df['no_show'] == 'Yes').astype(int)

    print("Engineering features aligned with runtime data...")

    # ===== Features that match runtime inference =====

    # 1. Age (clip to valid range)
    df['age'] = df['age'].clip(lower=0, upper=100)

    # 2. Gender (1 = Male, 0 = Female)
    df['gender'] = (df['gender'] == 'M').astype(int)

    # 3-5. Simulated patient history based on patient patterns
    # Group by patient to get historical patterns
    patient_history = df.groupby('patientid').agg({
        'no_show': ['count', 'sum']
    }).reset_index()
    patient_history.columns = ['patientid', 'totalAppointments', 'noShowCount']
    patient_history['cancelledCount'] = np.random.poisson(0.5, len(patient_history))

    df = df.merge(patient_history, on='patientid', how='left')

    # 6. No-show rate
    df['noShowRate'] = np.where(
        df['totalAppointments'] > 0,
        (df['noShowCount'] / df['totalAppointments']) * 100,
        0
    )

    # 7. Urgency score (simulated based on conditions)
    df['urgencyScore'] = 3  # Base urgency
    df.loc[df['hipertension'] == 1, 'urgencyScore'] += 1
    df.loc[df['diabetes'] == 1, 'urgencyScore'] += 1
    df.loc[df['age'] > 65, 'urgencyScore'] += 1
    df.loc[df['handcap'] > 0, 'urgencyScore'] += 1
    df['urgencyScore'] = df['urgencyScore'].clip(upper=5)

    # 8. Symptoms count (simulated based on conditions)
    df['symptomsCount'] = 1 + df['hipertension'] + df['diabetes'] + df['alcoholism'] + (df['handcap'] > 0).astype(int)

    # 9. Has red flags (chronic conditions)
    df['hasRedFlags'] = ((df['hipertension'] == 1) | (df['diabetes'] == 1) | (df['handcap'] > 0)).astype(int)

    # 10. Day of week (0 = Monday, 6 = Sunday)
    df['dayOfWeek'] = df['appointmentday'].dt.dayofweek

    # 11. Hour of scheduling
    df['hour'] = df['scheduledday'].dt.hour

    # 12. Is weekend
    df['isWeekend'] = df['dayOfWeek'].isin([5, 6]).astype(int)

    # 13. Days until appointment
    df['daysUntilAppointment'] = (df['appointmentday'] - df['scheduledday']).dt.days
    df['daysUntilAppointment'] = df['daysUntilAppointment'].clip(lower=0, upper=60)

    # 14. SMS received
    df['smsReceived'] = df['sms_received'].astype(int)

    return df


def prepare_features(df):
    """Prepare feature matrix and target variable"""

    feature_columns = [
        'age',
        'gender',
        'totalAppointments',
        'noShowCount',
        'cancelledCount',
        'noShowRate',
        'urgencyScore',
        'symptomsCount',
        'hasRedFlags',
        'dayOfWeek',
        'hour',
        'isWeekend',
        'daysUntilAppointment',
        'smsReceived'
    ]

    X = df[feature_columns].copy()
    y = df['no_show'].copy()

    # Handle any missing values
    X = X.fillna(0)

    return X, y, feature_columns


def train_no_show_model(X, y):
    """Train XGBoost classifier for no-show prediction"""
    print("\n" + "="*50)
    print("Training No-Show Prediction Model")
    print("="*50)

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"Training samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")
    print(f"No-show rate in training: {y_train.mean():.2%}")

    # Train model with class weight balancing
    scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()

    model = XGBClassifier(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        use_label_encoder=False,
        eval_metric='logloss'
    )

    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]

    print("\nModel Performance:")
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(f"ROC-AUC: {roc_auc_score(y_test, y_pred_proba):.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Showed', 'No-Show']))

    # Feature importance
    print("\nFeature Importances:")
    importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    print(importance.to_string(index=False))

    return model


def train_duration_model(df):
    """Train model for consultation duration prediction"""
    print("\n" + "="*50)
    print("Training Duration Prediction Model")
    print("="*50)

    # Create realistic duration based on patient characteristics
    np.random.seed(42)

    base_duration = 15  # Base consultation time in minutes

    # Factors affecting duration
    df['estimated_duration'] = base_duration
    df['estimated_duration'] += df['age'].apply(lambda x: 5 if x > 65 else (3 if x > 50 else 0))
    df['estimated_duration'] += df['hasRedFlags'] * 5
    df['estimated_duration'] += (df['urgencyScore'] - 3) * 3
    df['estimated_duration'] += df['symptomsCount'] * 2
    df['estimated_duration'] += np.random.normal(0, 2, len(df))
    df['estimated_duration'] = df['estimated_duration'].clip(lower=10, upper=45)

    feature_columns = [
        'age',
        'gender',
        'urgencyScore',
        'symptomsCount',
        'hasRedFlags',
        'dayOfWeek',
        'hour',
        'isWeekend'
    ]

    X = df[feature_columns].fillna(0)
    y = df['estimated_duration']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = XGBRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    )

    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(np.mean((y_test - y_pred) ** 2))

    print(f"\nModel Performance:")
    print(f"Mean Absolute Error: {mae:.2f} minutes")
    print(f"Root Mean Square Error: {rmse:.2f} minutes")
    print(f"Average Predicted Duration: {y_pred.mean():.1f} minutes")

    # Feature importance
    print("\nFeature Importances:")
    importance = pd.DataFrame({
        'feature': feature_columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    print(importance.to_string(index=False))

    return model


def save_feature_config():
    """Save feature configuration for runtime use"""
    config = {
        'no_show_features': FEATURE_NAMES,
        'duration_features': [
            'age', 'gender', 'urgencyScore', 'symptomsCount',
            'hasRedFlags', 'dayOfWeek', 'hour', 'isWeekend'
        ],
        'version': '2.0',
        'trained_on': pd.Timestamp.now().isoformat()
    }

    config_path = os.path.join(MODEL_DIR, 'feature_config.json')
    import json
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)

    print(f"\nFeature config saved to: {config_path}")


def main():
    """Main training pipeline"""
    print("="*60)
    print("MediFlow - ML Model Training v2.0")
    print("Features aligned with runtime inference")
    print("="*60)

    # Load and preprocess data
    df = load_and_preprocess_data()

    # Prepare features for no-show model
    X, y, feature_names = prepare_features(df)

    print(f"\nFeatures used ({len(feature_names)}): {feature_names}")
    print(f"Total samples: {len(df)}")
    print(f"No-show rate: {y.mean():.2%}")

    # Train no-show model
    no_show_model = train_no_show_model(X, y)

    # Train duration model
    duration_model = train_duration_model(df)

    # Save models
    print("\n" + "="*50)
    print("Saving Models")
    print("="*50)

    no_show_path = os.path.join(MODEL_DIR, 'no_show_model.pkl')
    duration_path = os.path.join(MODEL_DIR, 'duration_model.pkl')

    joblib.dump(no_show_model, no_show_path)
    joblib.dump(duration_model, duration_path)

    print(f"No-show model saved to: {no_show_path}")
    print(f"Duration model saved to: {duration_path}")

    # Save feature config
    save_feature_config()

    print("\n" + "="*60)
    print("Training Complete!")
    print("="*60)
    print("\nNext steps:")
    print("1. Restart the ML service: python app.py")
    print("2. Models will auto-load with aligned features")


if __name__ == '__main__':
    main()
