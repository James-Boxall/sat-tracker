import { useState, useRef, useCallback, useEffect } from "react";
import "./DateTimePicker.css";

const pad = (n) => String(n).padStart(2, "0");

const formatTime = (d) =>
  `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const formatFull = (d) => {
  const days   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${pad(d.getDate())} ${d.getFullYear()}`;
};

const toInputValue = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;


const HOURS_24 = 24 * 60 * 60 * 1000;

export const DateTimePicker = ({ dateRef, customdate, bumpVersion }) => {
  const [open, setOpen]                     = useState(false);
  const [baseDate, setBaseDate]             = useState(() => new Date(dateRef.current));
  const [elapsedMs, setElapsedMs]           = useState(0);  
  const [sliderOffsetMs, setSliderOffsetMs] = useState(0);
  const [slideradjust, setSlideradjust]     = useState(false);

  // Clock ticks
  useEffect(() => {
    const interval = setInterval(() => {
      if (!slideradjust) {
        setElapsedMs((prev) => {
          const next = prev + 1000;
          dateRef.current = new Date(baseDate.getTime() + next + sliderOffsetMs);
          return next;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [dateRef, slideradjust, baseDate, sliderOffsetMs]);

  const commit = useCallback((newDate, isCustom = true) => {
    dateRef.current   = newDate;
    customdate.current = isCustom;
    bumpVersion();
  }, [dateRef, customdate, bumpVersion]);

  const handleSliderChange = (e) => {
    const ms = Number(e.target.value);
    setSliderOffsetMs(ms);
    commit(new Date(baseDate.getTime() + elapsedMs + ms));
  };

  const handleInputChange = (e) => {
    const parsed = new Date(e.target.value);
    if (!isNaN(parsed.getTime())) {
      setBaseDate(parsed);      
      setElapsedMs(0);          
      setSliderOffsetMs(0);     
      commit(parsed);
    }
  };

  const handleSliderClick = () => {
    setSlideradjust(true);
  };

  const handleSliderClickOff = () => {
    setSlideradjust(false);
  };

  const handleReset = () => {
    const now = new Date();
    setBaseDate(now);           
    setElapsedMs(0);            
    setSliderOffsetMs(0);       
    commit(now, false);
  };

  const displayDate  = new Date(baseDate.getTime() + elapsedMs + sliderOffsetMs);
  const offsetHours  = sliderOffsetMs / (1000 * 60 * 60);
  const offsetLabel  = sliderOffsetMs === 0
    ? "0h"
    : `${offsetHours > 0 ? "+" : ""}${offsetHours.toFixed(1)}h`;

  return (
    <div className="dtp-box">

      {/* ── header ── */}
      <div className="dtp-header" onClick={() => setOpen((o) => !o)}>
        <span className="dtp-time">{formatTime(displayDate)}</span>
        <span className="dtp-toggle">{open ? "▲" : "▼"}</span>
        {customdate.current && <span className="dtp-custom-dot">●</span>}
      </div>

      {/* ── expanded panel ── */}
      {open && (
        <div className="dtp-panel">

          <span className="dtp-date-label">{formatFull(displayDate)}</span>

          {/* datetime input */}
          <div>
            <div className="dtp-field-label">Set date &amp; time</div>
            <input
              type="datetime-local"
              className="dtp-input"
              value={toInputValue(displayDate)}
              onChange={handleInputChange}
            />
          </div>

          {/* offset slider */}
          <div>
            <div className="dtp-offset-header">
              <span>Offset</span>
              <span className="dtp-offset-value">{offsetLabel}</span>
            </div>
            <input
              type="range"
              className="dtp-slider"
              min={-HOURS_24}
              max={HOURS_24}
              step={60000}
              value={sliderOffsetMs}
              onChange={handleSliderChange}
              onMouseDown={handleSliderClick}
              onMouseUp={handleSliderClickOff}
            />
            <div className="dtp-slider-axis">
              <span>−24h</span>
              <span>+24h</span>
            </div>
          </div>

          {/* reset */}
          <button className="dtp-reset" onClick={handleReset}>
            Reset to now
          </button>

        </div>
      )}

    </div>
  );
};

export default DateTimePicker;