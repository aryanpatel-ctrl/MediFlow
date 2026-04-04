const fallbackApiUrl = "http://localhost:5002/api";

export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || fallbackApiUrl,
};
