import React from 'react';

function Info(props) {
  return (
    <div className='relative h-screen py-4 m-h-full' name='info' id="info">
      <h2 className='mt-2 mb-20 text-2xl underline uppercase'>Built On Nina</h2>
      <h2 className='mt-2 text-1xl'>Projects Using Nina:</h2>
      
      <ul>
        <li>
          <a className='link' href='https://futuretape.xyz/' target='_blank' rel='noopener noreferrer'>Future Tape</a>
        </li>
        <li>
          <a className='link' href='https://www.spinamp.xyz/' target='_blank' rel='noopener noreferrer'>Spin Amp</a>
        </li>
        <li>
          <a className='link' href='https://corp-lounge.netlify.app/' target='_blank' rel='noopener noreferrer'>Corporation Plaza</a>
        </li>
      </ul>


      <div className='absolute bottom-4'>
        <p>Are you building on Nina?</p>
        <p>Get in touch:</p> 
        <a className='link' href='mailto:contact@ninaprotocol.com'>contact@ninaprotocol.com</a>
        <p>
          <a className='link' href='https://twitter.com/nina_engineer' target='_blank' rel='noopener noreferrer'>@nina_engineer</a>
        </p>
      </div>

      <div className='absolute right-0 bottom-4'>
        <p className='text-sm'>© {new Date().getFullYear()} Nina Protocol Corp</p>
      </div>

    </div>
  );
}

export default Info;