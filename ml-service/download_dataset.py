"""
MediFlow - Kaggle Dataset Downloader
Downloads the Hospital No-Show Appointments dataset from Kaggle

Dataset: https://www.kaggle.com/datasets/joniarroba/noshowappointments

Usage:
    Method 1 (Kaggle API - Recommended):
        1. Install kaggle: pip install kaggle
        2. Set up Kaggle API credentials (~/.kaggle/kaggle.json)
        3. Run: python download_dataset.py

    Method 2 (Manual):
        1. Go to https://www.kaggle.com/datasets/joniarroba/noshowappointments
        2. Download 'KaggleV2-May-2016.csv'
        3. Rename to 'noshowappointments.csv'
        4. Place in ml-service/data/ folder
"""

import os
import sys
import shutil

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
DATASET_NAME = 'joniarroba/noshowappointments'
OUTPUT_FILE = 'noshowappointments.csv'

def download_with_kaggle_api():
    """Download dataset using Kaggle API"""
    try:
        from kaggle.api.kaggle_api_extended import KaggleApi

        print("Authenticating with Kaggle API...")
        api = KaggleApi()
        api.authenticate()

        print(f"Downloading dataset: {DATASET_NAME}")
        api.dataset_download_files(
            DATASET_NAME,
            path=DATA_DIR,
            unzip=True
        )

        # Rename the file to expected name
        downloaded_files = os.listdir(DATA_DIR)
        csv_files = [f for f in downloaded_files if f.endswith('.csv')]

        if csv_files:
            original_file = os.path.join(DATA_DIR, csv_files[0])
            target_file = os.path.join(DATA_DIR, OUTPUT_FILE)

            if original_file != target_file:
                shutil.move(original_file, target_file)

            print(f"Dataset downloaded successfully to: {target_file}")
            return True
        else:
            print("Error: No CSV file found in downloaded data")
            return False

    except ImportError:
        print("Kaggle API not installed. Install with: pip install kaggle")
        return False
    except Exception as e:
        print(f"Error downloading dataset: {e}")
        return False

def download_with_curl():
    """Alternative download method using curl (requires manual authentication)"""
    print("""
Manual Download Instructions:
=============================
1. Go to: https://www.kaggle.com/datasets/joniarroba/noshowappointments
2. Click 'Download' button
3. Extract the ZIP file
4. Rename 'KaggleV2-May-2016.csv' to 'noshowappointments.csv'
5. Move the file to: {data_dir}

Dataset Information:
- ~110,000 medical appointments in Brazil
- Columns: PatientId, AppointmentID, Gender, ScheduledDay, AppointmentDay,
           Age, Neighbourhood, Scholarship, Hipertension, Diabetes,
           Alcoholism, Handcap, SMS_received, No-show
- Target: 'No-show' column (Yes = patient didn't show up)
""".format(data_dir=DATA_DIR))

def create_sample_data():
    """Create sample data for testing if Kaggle dataset is not available"""
    import random
    from datetime import datetime, timedelta

    print("Creating sample dataset for testing...")

    # Generate sample data
    num_samples = 10000

    data = []
    base_date = datetime(2016, 4, 1)

    for i in range(num_samples):
        scheduled_date = base_date + timedelta(days=random.randint(0, 60))
        appointment_date = scheduled_date + timedelta(days=random.randint(0, 30))
        age = random.randint(0, 100)
        gender = random.choice(['M', 'F'])
        scholarship = random.choice([0, 1])
        hipertension = random.choice([0, 1])
        diabetes = random.choice([0, 1])
        alcoholism = random.choice([0, 1])
        handcap = random.choice([0, 0, 0, 1, 2])  # Most have 0
        sms_received = random.choice([0, 1])

        # No-show probability based on various factors
        no_show_prob = 0.2
        if sms_received:
            no_show_prob -= 0.05
        if age > 60:
            no_show_prob -= 0.05
        if (appointment_date - scheduled_date).days > 14:
            no_show_prob += 0.1
        if scholarship:
            no_show_prob += 0.02

        no_show = 'Yes' if random.random() < no_show_prob else 'No'

        data.append({
            'PatientId': f'P{i+1:06d}',
            'AppointmentID': f'A{i+1:06d}',
            'Gender': gender,
            'ScheduledDay': scheduled_date.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'AppointmentDay': appointment_date.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'Age': age,
            'Neighbourhood': f'Area{random.randint(1, 50)}',
            'Scholarship': scholarship,
            'Hipertension': hipertension,
            'Diabetes': diabetes,
            'Alcoholism': alcoholism,
            'Handcap': handcap,
            'SMS_received': sms_received,
            'No-show': no_show
        })

    # Save to CSV
    import csv

    os.makedirs(DATA_DIR, exist_ok=True)
    output_path = os.path.join(DATA_DIR, OUTPUT_FILE)

    with open(output_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)

    print(f"Sample dataset created: {output_path}")
    print(f"Total samples: {num_samples}")
    return True

def verify_dataset():
    """Verify that the dataset exists and is valid"""
    import pandas as pd

    dataset_path = os.path.join(DATA_DIR, OUTPUT_FILE)

    if not os.path.exists(dataset_path):
        return False

    try:
        df = pd.read_csv(dataset_path)
        print(f"\nDataset verified successfully!")
        print(f"  - Path: {dataset_path}")
        print(f"  - Rows: {len(df):,}")
        print(f"  - Columns: {len(df.columns)}")
        print(f"  - No-show rate: {(df['No-show'] == 'Yes').mean():.2%}")
        return True
    except Exception as e:
        print(f"Error verifying dataset: {e}")
        return False

def main():
    print("="*60)
    print("MediFlow - Dataset Setup")
    print("="*60)

    os.makedirs(DATA_DIR, exist_ok=True)

    # Check if dataset already exists
    if verify_dataset():
        print("\nDataset is already set up and ready to use!")
        return

    print("\nDataset not found. Attempting to download...")

    # Try Kaggle API first
    if download_with_kaggle_api():
        verify_dataset()
        return

    # Show manual instructions
    download_with_curl()

    # Offer to create sample data
    response = input("\nWould you like to create sample data for testing? (y/n): ")
    if response.lower() == 'y':
        create_sample_data()
        verify_dataset()

    print("\nOnce you have the dataset, run 'python train_models.py' to train the models.")

if __name__ == '__main__':
    main()
