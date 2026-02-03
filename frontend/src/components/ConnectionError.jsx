
import loadingIcon from '/icons/satellite_loading_icon.png';

export function ConnectionError({ connected }) {
  return (
    !connected && (
      <div className="add-content-container">
        <div className='connection-text'>
        Connection Error: Server may be spinning up. Please wait.
        <img src={loadingIcon} alt="satellite" className="spin" />
        </div>
      </div>
    )
  );
}