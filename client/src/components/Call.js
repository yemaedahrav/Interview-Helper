import { useParams } from "react-router-dom"
import { useRef, useEffect, useState } from "react"
import { io } from "socket.io-client"
import Peer from "simple-peer"
import styled from "styled-components"
import { useAuthState } from "react-firebase-hooks/auth"
import { useHistory } from "react-router-dom"
import { auth, db, logout } from "../firebase"

const Container = styled.div`
        padding:20px
        display:flex
        height:100vh
        width:90%
        margin:auto
        flex-wrap:wrap
        padding:30%
    `
const StyledVideo = styled.video`
        height:10%
        width:10%
`
const Video = (props) => {
    const ref = useRef()
    useEffect(() => {
        props.peer.on("stream",stream => {
            ref.current.srcObject = stream
        })
    },[])

    return (
        <StyledVideo playsInline autoPlay ref = {ref} />
    )
}

const videoConstraints = {
    height: window.innerHeight / 4,
    width: window.innerWidth / 4
}

const Call = (props) => {
    const [ peers,setPeers ] = useState([])
    const userVideo = useRef()
    const peersRef = useRef([])
    const { id:documentId } = useParams()
    const socketRef = useRef()
    const [user, loading, error] = useAuthState(auth)
    const history = useHistory()
    
    useEffect(() => {
        if (loading) return;
        if (!user) return history.replace("/");
    }, [user, loading]);

    useEffect(() => {
        socketRef.current = io.connect("http://localhost:3001")
        navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true }).then(stream => {
            userVideo.current.srcObject = stream
            socketRef.current.emit("join room", documentId)
            socketRef.current.on("all users", users => {
                const peers = []
                users.forEach(userID => {
                    const peer = createPeer(userID, socketRef.current.id, stream);
                    peersRef.current.push({
                        peerID: userID,
                        peer,
                    })
                    peers.push(peer)
                })
                setPeers(peers)
            })

            socketRef.current.on("user joined", payload => {
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                })

                setPeers(users => [...users, peer])
            })

            socketRef.current.on("receiving returned signal", payload => {
                const item = peersRef.current.find(p => p.peerID === payload.id)
                item.peer.signal(payload.signal)
            })
        })
    }, [])

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        })

        peer.on("signal", signal => {
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal })
        })

        return peer
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        })

        peer.on("signal", signal => {
            socketRef.current.emit("returning signal", { signal, callerID })
        })

        peer.signal(incomingSignal)

        return peer
    }

    return (
        <Container>
            <StyledVideo muted ref={userVideo} autoPlay playsInline />
            {peers.map((peer, index) => {
                return (
                    <Video key={index} peer={peer} />
                )
            })}
            
        </Container>
    )
}

export default Call




