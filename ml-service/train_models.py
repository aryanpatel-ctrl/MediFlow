"""
MediFlow - ML Model Training Script
Trains no-show prediction and duration prediction models using the Kaggle dataset.
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score
from xgboost import XGBClassifier, XGBRegressor
import joblib
import os

# Paths
DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'noshowappointments.csv')
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

# Create models directory if not exists
os.makedirs(MODEL_DIR, exist_ok=True)


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

    # Feature Engineering
    print("Engineering features...")

    # Time-based features
    df['scheduled_hour'] = df['scheduledday'].dt.hour
    df['appointment_dayofweek'] = df['appointmentday'].dt.dayofweek
    df['is_weekend'] = df['appointment_dayofweek'].isin([5, 6]).astype(int)

    # Days between scheduling and appointment
    df['days_until_appointment'] = (df['appointmentday'] - df['scheduledday']).dt.days
    df['days_until_appointment'] = df['days_until_appointment'].clip(lower=0)

    # Target variable (1 = no-show, 0 = showed up)
    df['no_show'] = (df['no_show'] == 'Yes').astype(int)

    # Encode gender (1 = Male, 0 = Female)
    df['gender_encoded'] = (df['gender'] == 'M').astype(int)

    # Age groups
    df['age_group'] = pd.cut(df['age'], bins=[0, 18, 35, 50, 65, 100], labels=[0, 1, 2, 3, 4])
    df['age_group'] = df['age_group'].astype(int)

    # SMS reminder effect
    df['sms_received'] = df['sms_received'].astype(int)

    # Health condition flags
    df['has_condition'] = ((df['hipertension'] == 1) |
                           (df['diabetes'] == 1) |
                           (df['alcoholism'] == 1)).astype(int)

    # Handicap level (0-4)
    df['handicap'] = df['handcap'].clip(upper=4)

    return df


def prepare_features(df):
    """Prepare feature matrix and target variable"""

    feature_columns = [
        'age',
        'gender_encoded',
        'scholarship',
        'hipertension',
        'diabetes',
        'alcoholism',
        'handicap',
        'sms_received',
        'scheduled_hour',
        'appointment_dayofweek',
        'is_weekend',
        'days_until_appointment',
        'has_condition',
        'age_group'
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

    # Train model
    model = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
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
    print("\nTop 10 Feature Importances:")
    importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    print(importance.head(10).to_string(index=False))

    return model


def train_duration_model(df):
    """Train model for consultation duration prediction (simulated)"""
    print("\n" + "="*50)
    print("Training Duration Prediction Model")
    print("="*50)

    # Since we don't have actual duration data, we'll create a synthetic model
    # based on reasonable assumptions

    # Create synthetic duration based on conditions
    np.random.seed(42)

    base_duration = 15  # Base consultation time in minutes

    # Factors affecting duration
    df['estimated_duration'] = base_duration
    df['estimated_duration'] += df['age'].apply(lambda x: 3 if x > 60 else 0)
    df['estimated_duration'] += df['has_condition'] * 5
    df['estimated_duration'] += df['handicap'] * 2
    df['estimated_duration'] += np.random.normal(0, 3, len(df))
    df['estimated_duration'] = df['estimated_duration'].clip(lower=10, upper=45)

    feature_columns = [
        'age',
        'gender_encoded',
        'hipertension',
        'diabetes',
        'alcoholism',
        'handicap',
        'has_condition',
        'age_group'
    ]

    X = df[feature_columns].fillna(0)
    y = df['estimated_duration']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = XGBRegressor(
        n_estimators=50,
        max_depth=4,
        learning_rate=0.1,
        random_state=42
    )

    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    mae = np.mean(np.abs(y_test - y_pred))
    rmse = np.sqrt(np.mean((y_test - y_pred) ** 2))

    print(f"\nModel Performance:")
    print(f"Mean Absolute Error: {mae:.2f} minutes")
    print(f"Root Mean Square Error: {rmse:.2f} minutes")
    print(f"Average Predicted Duration: {y_pred.mean():.1f} minutes")

    return model


def main():
    """Main training pipeline"""
    print("="*60)
    print("MediFlow - ML Model Training")
    print("="*60)

    # Load and preprocess data
    df = load_and_preprocess_data()

    # Prepare features for no-show model
    X, y, feature_names = prepare_features(df)

    print(f"\nFeatures used: {feature_names}")
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

    print("\n" + "="*60)
    print("Training Complete!")
    print("="*60)


if __name__ == '__main__':
    main()
