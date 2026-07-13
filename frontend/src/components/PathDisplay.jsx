import React, { useState } from 'react';

function PathCard({ person, isLast }) {
  return (
    <div className="flex flex-col items-center">
      <div className="card py-4 px-6 flex items-center gap-4 min-w-[200px]">
        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
          {person.name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{person.name}</p>
          <p className="text-sm text-gray-500">Room {person.room_no}</p>
        </div>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center py-2">
          <svg className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <span className="text-[10px] text-brand-500 font-medium uppercase tracking-wider -mt-1">
            Consented
          </span>
        </div>
      )}
    </div>
  );
}

export default function PathDisplay({
  result,
  currentUser,
  onRequestSwap,
  swapSending,
  onWatchRoom,
  watchingLoading,
}) {
  const [swapConfirming, setSwapConfirming] = useState(false);

  if (!result) return null;

  if (!result.found) {
    return (
      <div className="space-y-4">
        <div className="card text-center py-8">
          <div className="text-5xl mb-4">🚫</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No consented path found</h3>
          <p className="text-gray-500 text-sm">
            There is no path using only explicitly consented connections to any of your target rooms.
          </p>
          <div className="mt-4 bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-medium mb-1">Possible reasons:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500">
              <li>No one in your network has a connection to those rooms</li>
              <li>People along the path haven't granted consent in the required direction</li>
              <li>Your connections are still pending confirmation</li>
            </ul>
          </div>
        </div>
        {onWatchRoom && (
          <button
            onClick={onWatchRoom}
            disabled={watchingLoading}
            className="btn-primary w-full"
          >
            {watchingLoading ? (
              <span className="flex items-center gap-2 justify-center">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : (
              '👀 No path yet — Watch for this room'
            )}
          </button>
        )}
      </div>
    );
  }

  const targetPerson = result.path[result.path.length - 1];
  const isOwnRoom = currentUser && currentUser.room_no?.toLowerCase() === result.target_room?.toLowerCase();

  const handleSwapClick = () => {
    if (!targetPerson) return;
    setSwapConfirming(true);
    const confirmed = window.confirm(
      `Request a room swap with ${targetPerson.name}?\n\n` +
      `You (Room ${currentUser?.room_no || '?'}) → Room ${result.target_room}\n` +
      `${targetPerson.name} (Room ${result.target_room}) → Room ${currentUser?.room_no || '?'}\n\n` +
      `They will need to accept for the swap to happen.`
    );
    if (confirmed) {
      onRequestSwap && onRequestSwap();
    }
    setSwapConfirming(false);
  };

  return (
    <div className="space-y-6">
      {/* Success banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎉</span>
          <div>
            <h3 className="font-semibold text-emerald-800">Path Found!</h3>
            <p className="text-sm text-emerald-700">
              Reached <strong>{result.target_room}</strong> in {result.path_length} hop{result.path_length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Path visualization */}
      <div className="flex flex-col items-center">
        {result.path.map((person, idx) => (
          <PathCard
            key={`${person.id}-${idx}`}
            person={person}
            isLast={idx === result.path.length - 1}
          />
        ))}
      </div>

      {/* Swap request button — prominent, single action */}
      {!isOwnRoom && targetPerson && onRequestSwap && (
        <button
          onClick={handleSwapClick}
          disabled={swapSending || swapConfirming}
          className="btn-primary w-full text-base py-4"
        >
          {swapSending ? (
            <span className="flex items-center gap-2 justify-center">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending request...
            </span>
          ) : (
            `Request swap with ${targetPerson.name} in ${result.target_room}`
          )}
        </button>
      )}

      {/* Alternative targets */}
      {result.alternative_targets && result.alternative_targets.length > 0 && (
        <div className="card py-4 px-5">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            Alternative Reachable Rooms
          </h4>
          <div className="space-y-2">
            {result.alternative_targets.map((alt, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-900">{alt.room}</span>
                <span className="text-xs text-gray-500">
                  {alt.path_length} hop{alt.path_length !== 1 ? 's' : ''} away
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consent explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">
          🔒 All edges on this path used directional consent
        </h4>
        <p className="text-sm text-blue-700 leading-relaxed">
          Each step in this path was only possible because the person at that step
          explicitly granted consent to be routed through toward the next person.
          Every arrow represents a one-directional consent — the reverse path may
          not be available.
        </p>
      </div>
    </div>
  );
}
