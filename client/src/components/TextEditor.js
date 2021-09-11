import React,{ useCallback, useEffect, useState } from "react"
import Quill from "quill"
import hljs from 'highlight.js'
import "quill/dist/quill.snow.css"
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.bubble.css'
import 'highlight.js/styles/dark.css'
import { io } from "socket.io-client"
import { useParams } from "react-router-dom"
import { useAuthState } from "react-firebase-hooks/auth"
import { useHistory } from "react-router-dom"
import { auth, db, logout } from "../firebase"

const SAVE_INTERVAL_MS = 2000
const TOOLBAR_OPTIONS = [
  ["code-block"]
]

export default function TextEditor() {
  const { id: documentId } = useParams()
  const [socket, setSocket] = useState()
  const [quill, setQuill] = useState()
  const [user, loading, error] = useAuthState(auth)
  const history = useHistory()
  useEffect(() => {
    if (loading) return;
    if (!user) return history.replace("/");
  }, [user, loading]);

  useEffect(() => {
    const s = io("http://localhost:3001")
    setSocket(s)

    return () => {
      s.disconnect()
    }
  }, [])

  useEffect(() => {
    if (socket == null || quill == null) return

    socket.once("load-document", document => {
      quill.setContents(document)
      quill.enable()
    })

    socket.emit("get-document", documentId)
  }, [socket, quill, documentId])

  useEffect(() => {
    if (socket == null || quill == null) return

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents())
    }, SAVE_INTERVAL_MS)

    return () => {
      clearInterval(interval)
    }
  }, [socket, quill])

  useEffect(() => {
    if (socket == null || quill == null) return

    const handler = delta => {
      quill.updateContents(delta)
    }
    socket.on("receive-changes", handler)

    return () => {
      socket.off("receive-changes", handler)
    }
  }, [socket, quill])

  useEffect(() => {
    if (socket == null || quill == null) return

    const handler = (delta, oldDelta, source) => {
      if (source !== "user") return
      socket.emit("send-changes", delta)
    }
    quill.on("text-change", handler)

    return () => {
      quill.off("text-change", handler)
    }
  }, [socket, quill])

  const wrapperRef = useCallback(wrapper => {
    if (wrapper == null) return

    wrapper.innerHTML = ""
    const editor = document.createElement("div")
    wrapper.append(editor)
    const q = new Quill(editor, {
      modules: {
          history: {
              delay: 2000,
              maxStack: 500,
              userOnly: true
          },
          syntax: {
              highlight: text => hljs.highlightAuto(text).value,
          },
          toolbar : TOOLBAR_OPTIONS  
      },
      theme: 'snow'
  })
    q.disable()
    q.setText("Loading...")
    setQuill(q)
  }, [])
  return <div className="container" ref={wrapperRef}></div>
}
