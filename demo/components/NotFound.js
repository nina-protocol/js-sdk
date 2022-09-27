import React from 'react';

function NotFound(props) {
  return (
    <div className='flex w-full h-screen border-2'>
      <div className='m-auto text-center'>
        <h1 className='m-auto text-2xl'>We couldn&apos;t find what you are looking for</h1>
        <h1 className='m-auto text-2xl'>:(</h1>
      </div>
    </div>
  );
}

export default NotFound;