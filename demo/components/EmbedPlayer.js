import { useEffect, useState, useRef } from "react";
import Image from 'next/image'
import {useRouter} from "next/router";
import NotFound from "./NotFound";
import Play from '../public/images/mui-play.svg'
import Pause from '../public/images/mui-pause.svg'
import NextArrow from '../public/images/mui-next.svg'
import PrevArrow from '../public/images/mui-prev.svg'
import { getImageFromCDN, loader } from "../utils/imageManager";

const EmbedPlayer = (props) => {
  let { hub, metadata, hubReleasePubkey, mouseOver } = props;
  const {query} = useRouter();

  const [tracks, setTracks] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [trackProgress, setTrackProgress] = useState(null);
  const [primaryColor, setPrimaryColor] = useState('#fff');
  const [secondaryColor, setSecondaryColor] = useState('#000');
  const [playlistOpen, setPlaylistOpen] = useState(false);

  const activeTrack = useRef(null);
  const audioPlayerRef = useRef()
  const intervalRef = useRef();
  const hasPrevious = useRef(false)
  const hasNext = useRef(false)

  useEffect(() => {
    audioPlayerRef.current = document.querySelector("#audio")
    return () => {
      clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(() => {
    metadata = metadata.filter( Boolean )
    setTracks(metadata);
  }, [metadata])
  
  useEffect(() => {
    if (tracks) {
      setActiveIndex(0);
      activeTrack.current = hub && !hubReleasePubkey ? tracks[0].metadata : tracks[0]
    }
  },[tracks])

  useEffect(() => {
    if (tracks) {
      let track;
      if (tracks.length > 1) {
        track = tracks[activeIndex].metadata;
        activeTrack.current = track;
        hasNext.current = (activeIndex + 1) <= tracks.length
        hasPrevious.current = activeIndex > 0
      } else {
        track = tracks[0];
      }
      activeTrack.current = track || tracks[0];
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = activeTrack.current?.animation_url || ''
      }
      if (playing) {
        play()
      }
    }
  }, [activeIndex])

  useEffect(() => {
    if (playlistOpen && !mouseOver) {
      setPlaylistOpen(false)
    }
  }, [mouseOver])
  

  const selectTrack = (trackIndex) => {
    if (trackIndex) {
      setTrackProgress(0);
      setActiveIndex(parseInt(trackIndex, 10));
      play()
    } else {
      console.warn('no index', trackIndex);
    }
  }


  const startTimer = () => {
    // Clear any timers already running
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {

      if (audioPlayerRef.current.currentTime > 0 && audioPlayerRef.current.currentTime < audioPlayerRef.current.duration && !audioPlayerRef.current.paused) {
        setTrackProgress(Math.ceil(audioPlayerRef.current.currentTime));
      } else if (audioPlayerRef.current.currentTime >= audioPlayerRef.current.duration) {
        next();
      }
    }, [300]);
  };

  const play = () => {
    if (audioPlayerRef.current.paused) {
      audioPlayerRef.current.play()
      if (!audioPlayerRef.current.paused) {
        setPlaying(true)
        startTimer()
      }
    } 
  }

  const pause = () => {
    audioPlayerRef.current.pause()
    setPlaying(false)
    clearInterval(intervalRef.current)
  }

  const previous = () => {
    if (hasPrevious.current) {
      setTrackProgress(0)
      setActiveIndex(activeIndex - 1)
    }
  }

  const next = () => {
    if ((activeIndex + 1) <= tracks.length) {
      setTrackProgress(0)
      setActiveIndex(activeIndex + 1)
    }
  }


  const onScrub = (value) => {
    // Clear any timers already running
    clearInterval(intervalRef.current);
    audioPlayerRef.current.currentTime = value;
    setTrackProgress(audioPlayerRef.current.currentTime);
  }

  const onScrubEnd = () => {
    // If not already playing, start
    audioPlayerRef.current.play()
    if (!audioPlayerRef.current.paused) {
      setPlaying(true)
      startTimer()
    }
  }

  const togglePlayList = (e) => {
    e.stopPropagation();
    setPlaylistOpen(!playlistOpen);
  }


  const formatTime = (duration) => {
    if (!duration || duration === 0) {
      return `00:00`;
    }
    let sec_num = parseInt(duration, 10)
    let hours = Math.floor(sec_num / 3600)
    let minutes = Math.floor((sec_num - hours * 3600) / 60)
    let seconds = sec_num - hours * 3600 - minutes * 60

    if (hours > 0) {
      minutes += hours * 60
    }
    if (minutes < 10) {
      minutes = '0' + minutes
    }
    if (seconds < 10) {
      seconds = '0' + seconds
    }
    return minutes + ':' + seconds
  }

  const currentPercentage = activeTrack.current ? `${(trackProgress / activeTrack.current.properties.files[0].duration) * 100}%` : '0%';
  const trackStyling = `
  -webkit-gradient(linear, 0% 0%, 100% 0%, color-stop(${currentPercentage}, #2D81FF), color-stop(${currentPercentage}, #bdb9b9))
`;


  if (tracks?.length === 0) {
    return (
        <NotFound />
    )
  }

  return (
    <div className="max-h-full font-helvetica" >
      {activeTrack.current && (
        <Image
          loader={loader}
          src={getImageFromCDN(activeTrack.current.image , 400, new Date(activeTrack.current.properties.date))}
          layout="responsive"
          objectFit="contain"
          objectPosition={"center"}
          height={100}
          width={100}
          priority={true}
        />
      )}

    <div className="absolute flex items-center top-2 left-2">
      <button className=' bg-black/50 w-[50px] h-[50px] flex rounded-full cursor-pointer'
        onClick={playing ? pause : play}
        >
          {playing ? 
          <Pause fill={'#fff'} className="m-auto" />
          :
          <Play fill={'#fff'} className="m-auto" />
        }
      </button>
      {activeTrack.current && (
        <div className="text-white p-1 h-[50%] ml-2 max-w-[90%] flex flex-col" >
          <a
            className="p-1 bg-black/50 "
            href={
              hub && !hubReleasePubkey ? 
              `https://hubs.ninaprotocol.com/${hub.handle}/releases/${tracks[activeIndex].accountData.hubRelease.publicKey}`
              :
              activeTrack.current.external_url
              } target='_blank' rel="noreferrer">{activeTrack.current.properties?.artist} - {activeTrack.current.properties.title.slice(0, 50)} {activeTrack.current.properties.title.length > 50 ? '...' : ''}
          </a>
          {hub && (
            <a
            className="p-1 mt-1 text-sm bg-black/50 w-[min-content] whitespace-nowrap cursor-pointer"
            target="_blank"
            rel="noreferrer"
            href={hub.data.externalUrl}>{hub.data.displayName}</a>
          )}
        </div>
      )}
    </div>
    {tracks?.length > 1 && (
      <div className="absolute z-[1] flex w-full pb-5 overflow-y-auto duration-500 ease-in-out -bottom-5 w-100 transition-height"
        style={{
          height: playlistOpen ? '90%' : '0',
          backgroundColor: primaryColor,
      }}
      >
        <ul className="mt-2 overflow-x-hidden" style={{color: secondaryColor}}>
          {tracks.map((track, index) => {
            return(
              <li 
                key={index}
                className="flex px-2 pt-1 cursor-pointer hover:opacity-50"
                style={{paddingBottom: index === tracks.length - 1 ? '100px' : '0'}}
                onClick={e => {
                  e.stopPropagation()
                  if (playing && activeIndex === index) {
                    pause()
                  } else {
                    selectTrack(e.currentTarget.getAttribute('data-trackindex'))}
                  }
                }
                data-trackindex={index}
                > 
                  <span>
                  {playing && (activeIndex === index ) ? (
                    <Pause fill={secondaryColor} className="m-auto scale-75" />
                  ) : (
                      <Play className="m-auto scale-75" />   
                  )}
                  </span> 
                  {track.metadata.name}</li> 
            )
          })}
        </ul>
      </div>
    )}
    {activeTrack.current && (
      <div className={`flex w-full absolute bottom-0 ease-in-out duration-300 z-[2]`} 
        style={{
          backgroundColor: primaryColor,
          transform: mouseOver ? 'translatey(0%)' : 'translateY(85%)',
      }}>
        <p className="absolute right-0 p-1 text-xs -top-6 bg-black/50" 
          style={{opacity : playlistOpen ? '0' : '100'}}
        >
          Powered by <a href='https://www.ninaprotocol.com' target='_blank' rel="noreferrer" className="link text-[#2D81FF]">Nina</a>.
        </p>
        <audio
          className="invisible"
          id="audio" 
          style={{width: "100%"}} 
          ref={audioPlayerRef}
        >
          <source type='audio/mp3' src={activeTrack.current?.properties.files[0].uri + '?ext=mp3'} ></source>
        </audio>
        <div className="z-10 flex flex-col content-center w-full pb-2">
          <input
            className="top-0 left-0 w-full progress rangeSlider"
            type="range"
            value={trackProgress || 0}
            step="1"
            min="0"
            max={activeTrack.current.properties.files[0].duration}
            onChange={(e) => onScrub(e.target.value)}
            onMouseUp={onScrubEnd}  
            onKeyUp={onScrubEnd}
            style={{
              background: trackStyling,
              borderRadius: '0px',
              cursor: 'pointer'
            }}
          />
          <div className="flex w-full gap-2 mt-2 ">
            <div className="flex w-1/2 ml-2">
              {tracks?.length > 1 && (
                <button className='cursor-pointer hover:opacity-50' onClick={previous}
                  style={{
                    opacity: !hasPrevious.current ? '50%' : '100%'
                  }}
                >
                  <PrevArrow fill={secondaryColor} className="m-auto" />
                </button>
              )}
              <button className="hover:opacity-50" onClick={playing ? pause : play} >
                {playing ?
                    <Pause fill={secondaryColor}/>
                : 
                  <Play fill={secondaryColor} />
                }
              </button>
              {tracks?.length > 1 && (
                <button className='cursor-pointer hover:opacity-50' onClick={next}
                  style={{
                    opacity: !hasNext.current ? '50%' : '100%'
                  }}
                >
                <NextArrow fill={secondaryColor} />
                </button>
              )}
              <div className="flex text-[#000] ml-2">
                {formatTime(trackProgress) || '0:00'} / {formatTime(activeTrack.current.properties.files[0].duration)}
              </div>
            </div>
            {tracks.length > 1 && (
              <div className="flex justify-end w-1/2 text-right">
                <p className="mr-2 cursor-pointer hover:opacity-50" style={{color: secondaryColor}} onClick={e => togglePlayList(e)}>
                  {playlistOpen ? '-' : '+'}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    )}
  </div>
)}


export default EmbedPlayer;