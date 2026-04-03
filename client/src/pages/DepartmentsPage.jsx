import { useEffect, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import { useAuth } from "../hooks";
import api from "../services/api";

const DEPARTMENT_TONES = ["sky", "rose", "mint", "sand", "stone", "teal", "ice", "clean"];

const normalizeMetric = (value, maxValue) => {
  if (!maxValue) {
    return 0;
  }

  return Math.max(4, Math.round((value / maxValue) * 30));
};

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function DepartmentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hospitalName, setHospitalName] = useState("");
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("doctors");

  useEffect(() => {
    fetchDepartments();
  }, [user]);

  const getTodayKey = () =>
    new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

  const getTodaySlotCount = (availability) => {
    const todayAvailability = availability?.[getTodayKey()];

    if (!todayAvailability?.isAvailable) {
      return 0;
    }

    return todayAvailability.slots?.length || 0;
  };

  const fetchDepartments = async () => {
    setLoading(true);

    try {
      const hospitalId = user?.hospitalId?._id || user?.hospitalId;

      if (!hospitalId) {
        setLoading(false);
        return;
      }

      const [hospitalRes, doctorsRes] = await Promise.all([
        api.get(`/hospitals/${hospitalId}`),
        api.get("/doctors", { params: { hospitalId } })
      ]);

      const hospital = hospitalRes.data.hospital;
      const doctors = doctorsRes.data.doctors || [];
      const specialtyNames = Array.from(new Set([
        ...(hospital?.specialties || []),
        ...doctors.map((doctor) => doctor.specialty).filter(Boolean)
      ]));

      const departmentRows = specialtyNames.map((specialty, index) => {
        const specialtyDoctors = doctors.filter((doctor) => doctor.specialty === specialty);
        const totalExperience = specialtyDoctors.reduce((sum, doctor) => sum + (doctor.experience || 0), 0);
        const totalFees = specialtyDoctors.reduce((sum, doctor) => sum + (doctor.consultationFee || 0), 0);
        const totalSlotsToday = specialtyDoctors.reduce(
          (sum, doctor) => sum + getTodaySlotCount(doctor.availability),
          0
        );
        const availableToday = specialtyDoctors.filter(
          (doctor) => getTodaySlotCount(doctor.availability) > 0
        ).length;

        return {
          name: specialty,
          doctorCount: specialtyDoctors.length,
          availableToday,
          totalSlotsToday,
          averageExperience: specialtyDoctors.length
            ? Math.round(totalExperience / specialtyDoctors.length)
            : 0,
          averageFee: specialtyDoctors.length
            ? Math.round(totalFees / specialtyDoctors.length)
            : 0,
          tags: specialtyDoctors.slice(0, 3).map((doctor) => getInitials(doctor.userId?.name || doctor.specialty)),
          note:
            specialtyDoctors.length > 0
              ? `Average experience ${Math.round(totalExperience / specialtyDoctors.length)} years with consultation fee around Rs. ${Math.round(totalFees / specialtyDoctors.length)}. ${totalSlotsToday} slots are configured for today.`
              : "No doctors assigned to this department yet.",
          subLabel: specialtyDoctors.length > 0
            ? `${availableToday} available today`
            : "No active doctors yet",
          staffLabel: `${specialtyDoctors.length} Doctors`,
          tone: DEPARTMENT_TONES[index % DEPARTMENT_TONES.length],
        };
      });

      setHospitalName(hospital?.name || "Hospital");
      setDepartments(departmentRows);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = [...departments]
    .filter((department) =>
      department.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }

      if (sortBy === "slots") {
        return b.totalSlotsToday - a.totalSlotsToday || a.name.localeCompare(b.name);
      }

      if (sortBy === "availability") {
        return b.availableToday - a.availableToday || a.name.localeCompare(b.name);
      }

      return b.doctorCount - a.doctorCount || a.name.localeCompare(b.name);
    });

  const totalDoctors = departments.reduce((sum, department) => sum + department.doctorCount, 0);
  const totalAvailableToday = departments.reduce((sum, department) => sum + department.availableToday, 0);
  const totalSlotsToday = departments.reduce((sum, department) => sum + department.totalSlotsToday, 0);
  const averageTeamSize = departments.length ? Math.round(totalDoctors / departments.length) : 0;
  const averageDepartmentFee = departments.length
    ? Math.round(
        departments.reduce((sum, department) => sum + department.averageFee, 0) / departments.length
      )
    : 0;

  const overviewCards = [
    {
      label: "Total Departments",
      value: String(departments.length),
      note: `${totalDoctors} doctors mapped in ${hospitalName}`,
      icon: "DT",
    },
    {
      label: "Doctors Available Today",
      value: String(totalAvailableToday),
      note: `${totalSlotsToday} consultation slots configured today`,
      icon: "AV",
    },
    {
      label: "Average Team per Department",
      value: String(averageTeamSize),
      note: `Average consultation fee Rs. ${averageDepartmentFee}`,
      icon: "TM",
    },
  ];

  const maxDoctors = Math.max(...departments.map((department) => department.doctorCount), 0);
  const maxAvailable = Math.max(...departments.map((department) => department.availableToday), 0);
  const maxSlots = Math.max(...departments.map((department) => department.totalSlotsToday), 0);
  const maxFees = Math.max(...departments.map((department) => department.averageFee), 0);

  const breakdownRows = filteredDepartments.map((department) => ({
    ...department,
    values: [
      normalizeMetric(department.averageFee, maxFees),
      normalizeMetric(department.totalSlotsToday, maxSlots),
      normalizeMetric(department.availableToday, maxAvailable),
      normalizeMetric(department.doctorCount, maxDoctors),
    ],
  }));

  const activeDepartmentName = breakdownRows[0]?.name;

  if (loading) {
    return (
      <AppLayout title="Departments" subtitle="Loading...">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading departments...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Departments" subtitle="Department overview and staffing">
      <main className="departments-page">
        <section className="departments-top-grid">
          <div className="departments-stat-column">
            {overviewCards.map((card) => (
              <article className="panel department-stat-card" key={card.label}>
                <div className="department-stat-card__top">
                  <span>{card.label}</span>
                  <button className="panel-more" type="button" aria-label={`${card.label} options`}>
                    ...
                  </button>
                </div>
                <strong>{card.value}</strong>
                <p>{card.note}</p>
                <div className="department-stat-card__icon">{card.icon}</div>
              </article>
            ))}
          </div>

          <section className="panel department-breakdown-card">
            <div className="panel-header panel-header--tight">
              <div>
                <h2>Department Capacity Breakdown</h2>
                <p>Current hospital specialty distribution</p>
                <strong className="department-breakdown-total">{hospitalName}</strong>
              </div>
              <div className="department-breakdown-legend" aria-label="Department legend">
                <span>
                  <i className="department-legend-dot department-legend-dot--soft" />
                  Avg Fee
                </span>
                <span>
                  <i className="department-legend-dot department-legend-dot--light" />
                  Slots Today
                </span>
                <span>
                  <i className="department-legend-dot department-legend-dot--teal" />
                  Available
                </span>
                <span>
                  <i className="department-legend-dot department-legend-dot--dark" />
                  Doctors
                </span>
              </div>
            </div>

            <div className="department-breakdown-chart">
              <div className="department-breakdown-scale">
                {[30, 25, 20, 15, 10, 5, 0].map((value) => (
                  <span key={value}>{value}</span>
                ))}
              </div>

              <div className="department-breakdown-grid">
                {breakdownRows.map((department) => (
                  <div className="department-breakdown-column" key={department.name}>
                    {department.values.map((value, index) => (
                      <div
                        className={`department-breakdown-bar department-breakdown-bar--${
                          department.name === activeDepartmentName && index === 3
                            ? "active"
                            : index === 3
                              ? "dark"
                              : index === 2
                                ? "teal"
                                : index === 1
                                  ? "light"
                                  : "soft"
                        }`}
                        key={`${department.name}-${index}`}
                        style={{ height: `${40 + value * 1.7}px` }}
                      >
                        {department.name === activeDepartmentName && index === 3 ? (
                          <div className="department-breakdown-tooltip">
                            <strong>{department.name}</strong>
                            <span>Doctors {department.doctorCount}</span>
                            <span>Available {department.availableToday}</span>
                            <span>Slots {department.totalSlotsToday}</span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    <span className="department-breakdown-label">{department.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>

        <div className="departments-filter-row">
          <label className="department-search">
            <input
              type="search"
              placeholder="Search Departments"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <span className="department-search__icon" aria-hidden="true">
              Q
            </span>
          </label>
          <select
            className="department-filter-button"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="doctors">Top Doctors</option>
            <option value="availability">Available Today</option>
            <option value="slots">Slots Today</option>
            <option value="name">A-Z</option>
          </select>
        </div>

        <section className="departments-card-grid">
          {filteredDepartments.length > 0 ? (
            filteredDepartments.map((department) => (
              <article className="panel department-card" key={department.name}>
                <div className={`department-card__media department-card__media--${department.tone}`} />
                <div className="department-card__body">
                  <div className="department-card__head">
                    <div>
                      <h2>{department.name}</h2>
                      <p>{department.subLabel}</p>
                    </div>
                    <div className="department-card__staff">
                      <div className="department-card__avatars" aria-hidden="true">
                        {(department.tags.length > 0 ? department.tags : [getInitials(department.name)]).map((tag) => (
                          <span key={`${department.name}-${tag}`}>{tag}</span>
                        ))}
                      </div>
                      <small>{department.staffLabel}</small>
                    </div>
                  </div>
                  <p className="department-card__note">{department.note}</p>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <p>No departments found for this hospital.</p>
            </div>
          )}
        </section>
      </main>
    </AppLayout>
  );
}

export default DepartmentsPage;
