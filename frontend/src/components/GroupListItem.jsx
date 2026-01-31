export function GroupListItem({ group, index,LoadedGroups, groupUpdate, groupLoader, groupRemover }) {

  const handleLoad = () => {
    

    if (!LoadedGroups.includes(group)) {
      groupUpdate((prev) => [...prev, group]);
      groupLoader(group);
    } else {
      groupRemover(group);
    }
  };

  return (
    <li className="list-item" key={index}>
      <span className="list-content">{group}</span>
      <button className="button" onClick={handleLoad}>
        {LoadedGroups.includes(group) ? "Remove" : "Load"}
      </button>
    </li>
  );
}