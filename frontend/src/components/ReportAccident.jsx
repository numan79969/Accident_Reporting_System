import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:8000';

const partyTypes = [
  { value: 'car', label: 'Car' },
  { value: 'motorcycle', label: 'Motorcycle / Bike' },
  { value: 'truck', label: 'Truck' },
  { value: 'bus', label: 'Bus' },
  { value: 'auto_rickshaw', label: 'Auto Rickshaw' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'pedestrian', label: 'Pedestrian / Walking Person' },
  { value: 'other', label: 'Other' },
];

const accidentTypes = [
  { value: 'vehicle_vs_vehicle', label: 'Two Vehicles (e.g. Car vs Bike)' },
  { value: 'single_vehicle', label: 'Single Vehicle Accident' },
  { value: 'person_fell', label: 'Person Slipped / Fell' },
  { value: 'vehicle_vs_pedestrian', label: 'Vehicle hit a Pedestrian' },
  { value: 'multi_vehicle', label: 'Multi-Vehicle Pileup' },
  { value: 'other', label: 'Other' },
];

const ReportAccident = () => {
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('minor');
  const [accidentBetween, setAccidentBetween] = useState('vehicle_vs_vehicle');
  const [partyAType, setPartyAType] = useState('car');
  const [partyAVehicleNumber, setPartyAVehicleNumber] = useState('');
  const [partyBType, setPartyBType] = useState('motorcycle');
  const [partyBVehicleNumber, setPartyBVehicleNumber] = useState('');
  const [injuries, setInjuries] = useState('none');
  const [weatherConditions, setWeatherConditions] = useState('clear');
  const [roadConditions, setRoadConditions] = useState('dry');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const showPartyB = ['vehicle_vs_vehicle', 'vehicle_vs_pedestrian', 'multi_vehicle'].includes(accidentBetween);
  const showVehicleNumbers = accidentBetween !== 'person_fell';

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(files);
    const previews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews(previews);
  };

  const removeImage = (idx) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Upload images first if any
      let imageNames = null;
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((f) => formData.append('files', f));
        const uploadRes = await axios.post(`${API}/accidents/upload-images`, formData, {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' },
        });
        imageNames = JSON.stringify(uploadRes.data.filenames);
      }

      await axios.post(`${API}/accidents/report`, {
        location,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        description,
        severity,
        vehicle_type: partyAType,
        accident_between: accidentBetween,
        party_a_type: partyAType,
        party_a_vehicle_number: partyAVehicleNumber || null,
        party_b_type: showPartyB ? partyBType : null,
        party_b_vehicle_number: showPartyB ? (partyBVehicleNumber || null) : null,
        injuries,
        weather_conditions: weatherConditions,
        road_conditions: roadConditions,
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
        images: imageNames,
      }, { headers });

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit report');
    } finally {
      setUploading(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
      },
      () => setError('Unable to retrieve your location.')
    );
  };

  return (
    <div className="report-form">
      <div className="form-header">
        <h2>Report an Accident</h2>
        <p className="form-subtitle">Fill out the details below to alert nearby emergency services</p>
        <div className="step-indicator">
          <div className={`step-dot ${step >= 1 ? 'active' : ''}`} onClick={() => setStep(1)}>1</div>
          <div className="step-line" />
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`} onClick={() => setStep(2)}>2</div>
          <div className="step-line" />
          <div className={`step-dot ${step >= 3 ? 'active' : ''}`} onClick={() => setStep(3)}>3</div>
        </div>
        <div className="step-labels">
          <span className={step === 1 ? 'active' : ''}>Location</span>
          <span className={step === 2 ? 'active' : ''}>Accident Details</span>
          <span className={step === 3 ? 'active' : ''}>Evidence & Contact</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Location */}
        {step === 1 && (
          <div className="form-step">
            <div className="section-title">Where did it happen?</div>
            <button type="button" className="location-btn" onClick={useMyLocation}>
              <span className="location-icon">📍</span> Use My Current Location
            </button>
            <div className="field-group">
              <label>Location Description</label>
              <input
                type="text"
                placeholder="Street, intersection, or landmark..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
            <div className="coords-row">
              <div className="field-group">
                <label>Latitude</label>
                <input type="text" placeholder="e.g. 28.6139" value={latitude} onChange={(e) => setLatitude(e.target.value)} required />
              </div>
              <div className="field-group">
                <label>Longitude</label>
                <input type="text" placeholder="e.g. 77.2090" value={longitude} onChange={(e) => setLongitude(e.target.value)} required />
              </div>
            </div>
            <button type="button" className="next-step-btn" onClick={() => setStep(2)}>
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Accident Details */}
        {step === 2 && (
          <div className="form-step">
            <div className="section-title">What happened?</div>

            <div className="field-group">
              <label>Type of Accident</label>
              <select value={accidentBetween} onChange={(e) => setAccidentBetween(e.target.value)}>
                {accidentTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="parties-section">
              <div className="party-card">
                <div className="party-label">Party A</div>
                <div className="field-group">
                  <label>Type</label>
                  <select value={partyAType} onChange={(e) => setPartyAType(e.target.value)}>
                    {partyTypes.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                {showVehicleNumbers && partyAType !== 'pedestrian' && (
                  <div className="field-group">
                    <label>Vehicle Number</label>
                    <input type="text" placeholder="e.g. MH 01 AB 1234" value={partyAVehicleNumber} onChange={(e) => setPartyAVehicleNumber(e.target.value)} />
                  </div>
                )}
              </div>

              {showPartyB && (
                <div className="party-card">
                  <div className="party-label">Party B</div>
                  <div className="field-group">
                    <label>Type</label>
                    <select value={partyBType} onChange={(e) => setPartyBType(e.target.value)}>
                      {partyTypes.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  {showVehicleNumbers && partyBType !== 'pedestrian' && (
                    <div className="field-group">
                      <label>Vehicle Number</label>
                      <input type="text" placeholder="e.g. DL 02 CD 5678" value={partyBVehicleNumber} onChange={(e) => setPartyBVehicleNumber(e.target.value)} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="two-col">
              <div className="field-group">
                <label>Severity</label>
                <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="field-group">
                <label>Injuries</label>
                <select value={injuries} onChange={(e) => setInjuries(e.target.value)}>
                  <option value="none">No injuries</option>
                  <option value="minor">Minor injuries</option>
                  <option value="serious">Serious injuries</option>
                  <option value="fatal">Fatal</option>
                </select>
              </div>
            </div>

            <div className="two-col">
              <div className="field-group">
                <label>Weather</label>
                <select value={weatherConditions} onChange={(e) => setWeatherConditions(e.target.value)}>
                  <option value="clear">Clear</option>
                  <option value="rainy">Rainy</option>
                  <option value="foggy">Foggy</option>
                  <option value="stormy">Stormy</option>
                  <option value="snowy">Snowy</option>
                </select>
              </div>
              <div className="field-group">
                <label>Road Condition</label>
                <select value={roadConditions} onChange={(e) => setRoadConditions(e.target.value)}>
                  <option value="dry">Dry</option>
                  <option value="wet">Wet</option>
                  <option value="icy">Icy</option>
                  <option value="muddy">Muddy</option>
                  <option value="under_construction">Under Construction</option>
                </select>
              </div>
            </div>

            <div className="field-group">
              <label>Description</label>
              <textarea
                placeholder="Describe what happened in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="step-nav">
              <button type="button" className="secondary" onClick={() => setStep(1)}>← Back</button>
              <button type="button" className="next-step-btn" onClick={() => setStep(3)}>Continue →</button>
            </div>
          </div>
        )}

        {/* Step 3: Images & Emergency Contact */}
        {step === 3 && (
          <div className="form-step">
            <div className="section-title">Upload Evidence & Emergency Contact</div>

            <div className="field-group">
              <label>Upload Accident Photos</label>
              <div className="upload-area">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  id="image-upload"
                  className="file-input"
                />
                <label htmlFor="image-upload" className="upload-label">
                  <span className="upload-icon">📷</span>
                  <span>Click to upload photos or drag & drop</span>
                  <span className="upload-hint">JPG, PNG up to 10MB each</span>
                </label>
              </div>
              {imagePreviews.length > 0 && (
                <div className="image-previews">
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} className="preview-thumb">
                      <img src={src} alt={`Preview ${idx + 1}`} />
                      <button type="button" className="remove-img" onClick={() => removeImage(idx)}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="two-col">
              <div className="field-group">
                <label>Emergency Contact Name</label>
                <input type="text" placeholder="Contact name" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
              </div>
              <div className="field-group">
                <label>Emergency Contact Phone</label>
                <input type="tel" placeholder="Phone number" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
              </div>
            </div>

            <div className="step-nav">
              <button type="button" className="secondary" onClick={() => setStep(2)}>← Back</button>
              <button type="submit" className="submit-btn" disabled={uploading}>
                {uploading ? 'Submitting...' : '🚨 Submit Report'}
              </button>
            </div>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
};

export default ReportAccident;