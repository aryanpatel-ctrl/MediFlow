import { useState } from "react";
import { DoctorRecord } from "../../services/doctors";
import { BookAppointmentScreen } from "./screens/BookAppointmentScreen";
import { DoctorListScreen } from "./screens/DoctorListScreen";
import { PatientHomeScreen } from "./screens/PatientHomeScreen";

type PatientRoute =
  | { name: "home" }
  | { name: "doctors" }
  | { name: "doctor-details"; doctor: DoctorRecord }
  | { name: "booking"; doctor: DoctorRecord };

export function PatientNavigator() {
  const [route, setRoute] = useState<PatientRoute>({ name: "home" });

  if (route.name === "doctors") {
    return (
      <DoctorListScreen
        onBack={() => setRoute({ name: "home" })}
        onSelectDoctor={(doctor) => setRoute({ name: "doctor-details", doctor })}
      />
    );
  }

  if (route.name === "doctor-details") {
    return (
      <DoctorListScreen
        selectedDoctorId={route.doctor._id}
        initialDoctor={route.doctor}
        onBack={() => setRoute({ name: "doctors" })}
        onSelectDoctor={(doctor) => setRoute({ name: "doctor-details", doctor })}
        onContinueToBooking={(doctor) => setRoute({ name: "booking", doctor })}
      />
    );
  }

  if (route.name === "booking") {
    return (
      <BookAppointmentScreen
        doctor={route.doctor}
        onBack={() => setRoute({ name: "doctor-details", doctor: route.doctor })}
        onBooked={() => setRoute({ name: "home" })}
      />
    );
  }

  return <PatientHomeScreen onOpenDoctors={() => setRoute({ name: "doctors" })} />;
}
