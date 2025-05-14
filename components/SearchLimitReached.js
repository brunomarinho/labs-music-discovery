export default function SearchLimitReached() {
  return (
    <div className="search-limit-reached">
      <div className="limit-reached-content">
        <h2 className="limit-reached-title">Search Limit Reached</h2>
        
        <p className="limit-reached-message">
          You've used all 3 of your searches. 
          However, you can still explore any artists that have already been searched by other users.
        </p>
        
        <div className="limit-reached-suggestions">
          <h3>Try these popular searches:</h3>
          <ul>
            <li>Taylor Swift</li>
            <li>Daft Punk</li>
            <li>Foo Fighters</li>
            <li>David Bowie</li>
          </ul>
        </div>
        
        <p className="limit-reached-info">
          Every time a user searches for an artist, the results are cached and become available to everyone!
        </p>
      </div>
    </div>
  );
}