"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Play, Square, Music, Wifi, WifiOff, ChevronDown, ChevronUp, Settings, Monitor } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function RobePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [tempo, setTempo] = useState([100])
  const [currentNote, setCurrentNote] = useState<string>("")
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [midiInfo, setMidiInfo] = useState<any>(null)
  const [sustainEnabled, setSustainEnabled] = useState(true)
  const [velocityEnabled, setVelocityEnabled] = useState(false)
  const [debugMenuOpen, setDebugMenuOpen] = useState(false)
  const [keyBindingMode, setKeyBindingMode] = useState(false)
  const [customBindings, setCustomBindings] = useState({
    play: "F1",
    pause: "F2",
    stop: "F3",
    slowDown: "F4",
    speedUp: "F5",
    toggleSustain: "F6",
    toggleVelocity: "F7",
  })
  const [waitingForKey, setWaitingForKey] = useState<string | null>(null)
  const [globalKeyboardEnabled, setGlobalKeyboardEnabled] = useState(false)

  const [currentPosition, setCurrentPosition] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const [windowTargetingEnabled, setWindowTargetingEnabled] = useState(false)
  const [availableWindows, setAvailableWindows] = useState<Array<{ title: string; pid?: number }>>([])
  const [selectedWindow, setSelectedWindow] = useState<string>("")
  const [windowTargetingSupported, setWindowTargetingSupported] = useState(false)

  const [useMidiOutput, setUseMidiOutput] = useState(false)
  const [availableMidiDevices, setAvailableMidiDevices] = useState<string[]>([])
  const [selectedMidiDevice, setSelectedMidiDevice] = useState<string>("")

  const { toast } = useToast()

  const connectWebSocket = useCallback(() => {
    try {
      console.log("[v0] Attempting to connect to WebSocket at ws://localhost:8000/ws")
      const websocket = new WebSocket("ws://localhost:8000/ws")

      websocket.onopen = () => {
        console.log("[v0] WebSocket connected successfully")
        setWsConnected(true)
        setWs(websocket)
        toast({
          title: "Connected",
          description: "Successfully connected to ROBE server",
        })
      }

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("[v0] WebSocket message received:", data)
          if (data.type === "current_note") {
            setCurrentNote(data.note)
          } else if (data.type === "tempo_change") {
            setTempo([data.tempo])
            toast({
              title: "Tempo Changed",
              description: `Tempo set to ${data.tempo}% via keyboard`,
            })
          } else if (data.type === "sustain_change") {
            setSustainEnabled(data.enabled)
            toast({
              title: `Sustain ${data.enabled ? "Enabled" : "Disabled"}`,
              description: "Changed via keyboard shortcut",
            })
          } else if (data.type === "velocity_change") {
            setVelocityEnabled(data.enabled)
            toast({
              title: `Velocity ${data.enabled ? "Enabled" : "Disabled"}`,
              description: "Changed via keyboard shortcut",
            })
          } else if (data.type === "status") {
            setGlobalKeyboardEnabled(true)
          } else if (data.type === "position_update") {
            if (!isDragging) {
              setCurrentPosition(data.position)
              setTotalDuration(data.duration)
            }
          }
        } catch (error) {
          console.error("[v0] Error parsing WebSocket message:", error)
        }
      }

      websocket.onclose = (event) => {
        console.log("[v0] WebSocket connection closed, code:", event.code, "reason:", event.reason)
        setWsConnected(false)
        setWs(null)

        if (event.code !== 1000) {
          setTimeout(() => {
            console.log("[v0] Attempting to reconnect WebSocket...")
            connectWebSocket()
          }, 3000)
        }
      }

      websocket.onerror = (error) => {
        console.error("[v0] WebSocket error details:", {
          readyState: websocket.readyState,
          url: websocket.url,
          error: error,
        })
        setWsConnected(false)
        toast({
          title: "Connection Error",
          description: "Cannot connect to ROBE server. Please start the Python backend server first.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Failed to create WebSocket connection:", error)
      setWsConnected(false)
      toast({
        title: "Connection Failed",
        description: "Failed to create WebSocket connection. Check if the backend server is running.",
        variant: "destructive",
      })
    }
  }, [toast, isDragging])

  const fetchAvailableWindows = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/windows")
      if (response.ok) {
        const data = await response.json()
        setAvailableWindows(data.windows || [])
        setWindowTargetingSupported(true)
        console.log("[v0] Successfully fetched available windows:", data.windows?.length || 0)
      }
    } catch (error) {
      console.log("Window targeting not supported:", error)
      setWindowTargetingSupported(false)
    }
  }

  const fetchAvailableMidiDevices = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/midi-devices")
      if (response.ok) {
        const data = await response.json()
        setAvailableMidiDevices(data.devices || [])
        console.log("[v0] Successfully fetched MIDI devices:", data.devices?.length || 0)
      }
    } catch (error) {
      console.log("MIDI devices not available:", error)
      setAvailableMidiDevices([])
    }
  }

  const handleWindowTargetingToggle = async (enabled: boolean) => {
    try {
      const response = await fetch("http://localhost:8000/api/window-target", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled,
          window_title: enabled ? selectedWindow : null,
        }),
      })

      if (response.ok) {
        setWindowTargetingEnabled(enabled)
        console.log("[v0] Window targeting toggled:", enabled, selectedWindow)
        toast({
          title: `Window Targeting ${enabled ? "Enabled" : "Disabled"}`,
          description: enabled ? `Keys will be sent to: ${selectedWindow}` : "Keys will be sent globally",
        })
      }
    } catch (error) {
      console.error("Window targeting toggle failed:", error)
      toast({
        title: "Toggle Failed",
        description: "Failed to update window targeting setting",
        variant: "destructive",
      })
    }
  }

  const handleMidiOutputToggle = async (enabled: boolean) => {
    try {
      const response = await fetch("http://localhost:8000/api/midi-output", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled,
          midi_device: enabled ? selectedMidiDevice || null : null,
        }),
      })

      if (response.ok) {
        setUseMidiOutput(enabled)
        console.log("[v0] MIDI output toggled:", enabled, selectedMidiDevice)
        toast({
          title: `MIDI Output ${enabled ? "Enabled" : "Disabled"}`,
          description: enabled
            ? `Direct MIDI output ${selectedMidiDevice ? `to: ${selectedMidiDevice}` : "(default device)"}`
            : "Using keyboard simulation",
        })
      }
    } catch (error) {
      console.error("MIDI output toggle failed:", error)
      toast({
        title: "Toggle Failed",
        description: "Failed to update MIDI output setting",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    connectWebSocket()

    const checkServerInfo = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/info")
        if (response.ok) {
          const info = await response.json()
          setGlobalKeyboardEnabled(info.keyboard_controls_enabled || false)
          setUseMidiOutput(info.use_midi_output || false)
          setSelectedMidiDevice(info.midi_device || "")
          console.log("[v0] Successfully fetched server info:", info)
        }
      } catch (error) {
        console.log("Could not fetch server info:", error)
      }
    }

    checkServerInfo()
    fetchAvailableWindows()
    fetchAvailableMidiDevices() // Fetch MIDI devices on startup

    return () => {
      if (ws) {
        ws.close(1000, "Component unmounting")
      }
    }
  }, [connectWebSocket])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)

    const formData = new FormData()
    formData.append("file", file)

    try {
      console.log("[v0] Uploading file:", file.name)
      const response = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        setMidiInfo(result.info)
        console.log("[v0] File uploaded successfully:", result)
        toast({
          title: "File Uploaded",
          description: `Successfully uploaded ${file.name}`,
        })
      } else {
        throw new Error("Upload failed")
      }
    } catch (error) {
      console.error("Upload failed:", error)
      toast({
        title: "Upload Failed",
        description: "Failed to upload MIDI file. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePlay = async () => {
    try {
      console.log("[v0] Sending play command to backend")
      const response = await fetch("http://localhost:8000/api/play", {
        method: "POST",
      })

      if (response.ok) {
        setIsPlaying(true)
        console.log("[v0] Play command successful")
        toast({
          title: "Playback Started",
          description: "MIDI file is now playing and sending keystrokes",
        })
      } else {
        const errorText = await response.text()
        console.error("[v0] Play command failed:", response.status, errorText)
        throw new Error("Play failed")
      }
    } catch (error) {
      console.error("Play failed:", error)
      toast({
        title: "Playback Failed",
        description: "Failed to start playback. Check if the server is running.",
        variant: "destructive",
      })
    }
  }

  const handleStop = async () => {
    try {
      console.log("[v0] Sending stop command to backend")
      const response = await fetch("http://localhost:8000/api/stop", {
        method: "POST",
      })

      if (response.ok) {
        setIsPlaying(false)
        setCurrentNote("")
        console.log("[v0] Stop command successful")
        toast({
          title: "Playback Stopped",
          description: "MIDI playback has been stopped",
        })
      } else {
        const errorText = await response.text()
        console.error("[v0] Stop command failed:", response.status, errorText)
        throw new Error("Stop failed")
      }
    } catch (error) {
      console.error("Stop failed:", error)
      toast({
        title: "Stop Failed",
        description: "Failed to stop playback",
        variant: "destructive",
      })
    }
  }

  const handleTempoChange = async (value: number[]) => {
    const newTempo = value[0]
    setTempo([newTempo])

    if (!wsConnected) return

    try {
      console.log("[v0] Sending tempo change to backend:", newTempo)
      const response = await fetch("http://localhost:8000/api/tempo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tempo: newTempo }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Tempo change failed:", response.status, errorText)
        throw new Error("Tempo change failed")
      } else {
        console.log("[v0] Tempo change successful")
      }
    } catch (error) {
      console.error("Tempo change failed:", error)
      toast({
        title: "Tempo Change Failed",
        description: "Failed to update tempo",
        variant: "destructive",
      })
    }
  }

  const handleSustainToggle = async (enabled: boolean) => {
    setSustainEnabled(enabled)
    try {
      console.log("[v0] Sending sustain toggle to backend:", enabled)
      await fetch("http://localhost:8000/api/sustain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      })
      console.log("[v0] Sustain toggle successful")
      toast({
        title: `Sustain ${enabled ? "Enabled" : "Disabled"}`,
        description: `Sustain pedal support is now ${enabled ? "on" : "off"}`,
      })
    } catch (error) {
      console.error("Sustain toggle failed:", error)
      setSustainEnabled(!enabled)
      toast({
        title: "Toggle Failed",
        description: "Failed to update sustain setting",
        variant: "destructive",
      })
    }
  }

  const handleVelocityToggle = async (enabled: boolean) => {
    setVelocityEnabled(enabled)
    try {
      console.log("[v0] Sending velocity toggle to backend:", enabled)
      await fetch("http://localhost:8000/api/velocity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      })
      console.log("[v0] Velocity toggle successful")
      toast({
        title: `Velocity ${enabled ? "Enabled" : "Disabled"}`,
        description: `Velocity mapping is now ${enabled ? "on" : "off"}`,
      })
    } catch (error) {
      console.error("Velocity toggle failed:", error)
      setVelocityEnabled(!enabled)
      toast({
        title: "Toggle Failed",
        description: "Failed to update velocity setting",
        variant: "destructive",
      })
    }
  }

  const triggerFileUpload = () => {
    const fileInput = document.getElementById("midi-upload") as HTMLInputElement
    fileInput?.click()
  }

  const handleKeyBinding = (action: string) => {
    setWaitingForKey(action)
    toast({
      title: "Press a key",
      description: `Press the key you want to bind to ${action}`,
    })
  }

  const handleSeek = async (position: number) => {
    try {
      console.log("[v0] Sending seek command to backend:", position)
      const response = await fetch("http://localhost:8000/api/seek", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ position }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Seek command failed:", response.status, errorText)
        throw new Error("Seek failed")
      } else {
        console.log("[v0] Seek command successful")
        // Update local position immediately for better UX
        setCurrentPosition(position)
      }
    } catch (error) {
      console.error("Seek failed:", error)
      toast({
        title: "Seek Failed",
        description: "Failed to seek to position",
        variant: "destructive",
      })
    }
  }

  const handleProgressChange = (value: number[]) => {
    const newPosition = value[0]
    console.log("[v0] Progress bar dragging to position:", newPosition)
    setCurrentPosition(newPosition)
    setIsDragging(true)
  }

  const handleProgressCommit = (value: number[]) => {
    const newPosition = value[0]
    console.log("[v0] Progress bar seek committed to position:", newPosition)
    setIsDragging(false)

    // Only seek if we're playing and connected
    if (isPlaying && wsConnected) {
      handleSeek(newPosition)
    } else {
      console.log("[v0] Seek skipped - not playing or not connected")
    }
  }

  const handleKeyBindingCapture = (event: KeyboardEvent) => {
    if (waitingForKey) {
      event.preventDefault()
      const keyCode = event.code
      console.log("[v0] Key binding captured:", keyCode, "for action:", waitingForKey)

      setCustomBindings((prev) => ({
        ...prev,
        [waitingForKey]: keyCode,
      }))
      setWaitingForKey(null)

      toast({
        title: "Key Bound",
        description: `${waitingForKey} is now bound to ${keyCode}`,
      })

      const updatedBindings = {
        ...customBindings,
        [waitingForKey]: keyCode,
      }
      updateBackendKeyBindings(updatedBindings)
    }
  }

  const updateBackendKeyBindings = async (bindings: typeof customBindings) => {
    try {
      const backendBindings: Record<string, string> = {}

      if (bindings.play) backendBindings[bindings.play.toLowerCase().replace("key", "")] = "play"
      if (bindings.pause) backendBindings[bindings.pause.toLowerCase().replace("key", "")] = "pause"
      if (bindings.stop) backendBindings[bindings.stop.toLowerCase().replace("key", "")] = "stop"
      if (bindings.slowDown) backendBindings[bindings.slowDown.toLowerCase().replace("key", "")] = "slow_down"
      if (bindings.speedUp) backendBindings[bindings.speedUp.toLowerCase().replace("key", "")] = "speed_up"
      if (bindings.toggleSustain)
        backendBindings[bindings.toggleSustain.toLowerCase().replace("key", "")] = "toggle_sustain"
      if (bindings.toggleVelocity)
        backendBindings[bindings.toggleVelocity.toLowerCase().replace("key", "")] = "toggle_velocity"

      console.log("[v0] Sending key bindings to backend:", backendBindings)

      const response = await fetch("http://localhost:8000/api/keyboard-bindings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bindings: backendBindings }),
      })

      if (!response.ok) {
        console.error("[v0] Failed to update backend key bindings:", response.status)
      } else {
        console.log("[v0] Backend key bindings updated successfully")
      }
    } catch (error) {
      console.error("[v0] Error updating backend key bindings:", error)
    }
  }

  useEffect(() => {
    const handleGlobalKeyPress = (event: KeyboardEvent) => {
      // Only handle if global keyboard is enabled and not in key binding mode
      if (!globalKeyboardEnabled || keyBindingMode || waitingForKey) return

      console.log("[v0] Global key pressed:", event.code, event.key)

      // Prevent default behavior for function keys
      if (event.code.startsWith("F") && event.code.length <= 3) {
        event.preventDefault()
      }

      // Handle custom key bindings
      const keyPressed = event.code

      if (keyPressed === customBindings.play) {
        console.log("[v0] Global play key triggered")
        if (!isPlaying && selectedFile && wsConnected) {
          handlePlay()
        }
      } else if (keyPressed === customBindings.pause) {
        console.log("[v0] Global pause key triggered")
        if (isPlaying) {
          handleStop() // Using stop as pause functionality
        }
      } else if (keyPressed === customBindings.stop) {
        console.log("[v0] Global stop key triggered")
        if (isPlaying) {
          handleStop()
        }
      } else if (keyPressed === customBindings.slowDown) {
        console.log("[v0] Global slow down key triggered")
        if (wsConnected) {
          const newTempo = Math.max(25, tempo[0] - 10)
          handleTempoChange([newTempo])
        }
      } else if (keyPressed === customBindings.speedUp) {
        console.log("[v0] Global speed up key triggered")
        if (wsConnected) {
          const newTempo = Math.min(200, tempo[0] + 10)
          handleTempoChange([newTempo])
        }
      } else if (keyPressed === customBindings.toggleSustain) {
        console.log("[v0] Global sustain toggle key triggered")
        if (wsConnected) {
          handleSustainToggle(!sustainEnabled)
        }
      } else if (keyPressed === customBindings.toggleVelocity) {
        console.log("[v0] Global velocity toggle key triggered")
        if (wsConnected) {
          handleVelocityToggle(!velocityEnabled)
        }
      }
    }

    // Add global event listeners
    document.addEventListener("keydown", handleGlobalKeyPress)
    document.addEventListener("keydown", handleKeyBindingCapture)

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyPress)
      document.removeEventListener("keydown", handleKeyBindingCapture)
    }
  }, [
    globalKeyboardEnabled,
    keyBindingMode,
    waitingForKey,
    customBindings,
    isPlaying,
    selectedFile,
    wsConnected,
    tempo,
    sustainEnabled,
    velocityEnabled,
    toast,
  ])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="h-screen bg-gray-900 p-3 overflow-hidden">
      <div className="h-full max-w-7xl mx-auto grid grid-cols-12 gap-3">
        <div className="col-span-5 space-y-3 flex flex-col">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">ROBE</h1>
            <p className="text-gray-300 text-sm">MIDI-to-QWERTY Player</p>
            <div className="flex items-center justify-center gap-2">
              {wsConnected ? (
                <div className="flex items-center gap-1 text-green-400 text-xs">
                  <Wifi className="h-3 w-3" />
                  Connected
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-400 text-xs">
                  <WifiOff className="h-3 w-3" />
                  Disconnected
                </div>
              )}
              {globalKeyboardEnabled && (
                <div className="flex items-center gap-1 text-blue-400 text-xs">
                  <Settings className="h-3 w-3" />
                  Global Keys
                </div>
              )}
              {windowTargetingEnabled && (
                <div className="flex items-center gap-1 text-purple-400 text-xs">
                  <Monitor className="h-3 w-3" />
                  Focused Window
                </div>
              )}
              {useMidiOutput && (
                <div className="flex items-center gap-1 text-green-400 text-xs">
                  <Music className="h-3 w-3" />
                  MIDI Output
                </div>
              )}
            </div>
          </div>

          <Card className="border-gray-700 shadow-lg bg-gray-800 flex-1">
            <CardHeader className="bg-gray-750 border-b border-gray-700 py-2">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Music className="h-4 w-4" />
                Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3 h-full overflow-auto">
              <div className="space-y-2">
                <Label htmlFor="midi-upload" className="text-gray-200 font-medium text-sm">
                  Upload MIDI File
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="midi-upload"
                    type="file"
                    accept=".mid,.midi"
                    onChange={handleFileUpload}
                    className="border-gray-600 focus:border-blue-500 focus:ring-blue-500 bg-gray-700 text-white placeholder:text-gray-400 text-sm hidden"
                  />
                  <Button
                    onClick={triggerFileUpload}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800 flex-1 flex items-center gap-2 disabled:opacity-50 flex-1 text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    {selectedFile ? selectedFile.name : "Choose MIDI File"}
                  </Button>
                </div>
                {selectedFile && (
                  <p className="text-xs text-gray-300 bg-gray-700 p-2 rounded border border-gray-600">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePlay}
                  disabled={!selectedFile || isPlaying || !wsConnected}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 disabled:opacity-50 flex-1 text-sm"
                >
                  <Play className="h-3 w-3" />
                  Play
                </Button>
                <Button
                  onClick={handleStop}
                  disabled={!isPlaying}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center gap-2 bg-gray-800 flex-1 text-sm"
                >
                  <Square className="h-3 w-3" />
                  Stop
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-200 font-medium text-sm">Tempo: {tempo[0]}%</Label>
                <Slider
                  value={tempo}
                  onValueChange={handleTempoChange}
                  max={200}
                  min={25}
                  step={5}
                  className="w-full"
                  disabled={!wsConnected}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>25%</span>
                  <span>100%</span>
                  <span>200%</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-200 font-medium text-sm">Progress</Label>
                  <span className="text-xs text-gray-400">
                    {formatTime(currentPosition)} / {formatTime(totalDuration)}
                  </span>
                </div>
                <Slider
                  value={[currentPosition]}
                  onValueChange={handleProgressChange}
                  onValueCommit={handleProgressCommit}
                  max={totalDuration || 100}
                  min={0}
                  step={0.1}
                  className="w-full"
                  disabled={!wsConnected || !selectedFile}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0:00</span>
                  <span>{formatTime(totalDuration)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-700">
                <Label className="text-gray-200 font-medium text-sm">Options</Label>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sustain-toggle" className="text-gray-300 text-sm cursor-pointer">
                    Sustain Pedal
                  </Label>
                  <Button
                    id="sustain-toggle"
                    variant={sustainEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSustainToggle(!sustainEnabled)}
                    disabled={!wsConnected}
                    className={`h-6 px-2 text-xs ${
                      sustainEnabled
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800"
                    }`}
                  >
                    {sustainEnabled ? "ON" : "OFF"}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="velocity-toggle" className="text-gray-300 text-sm cursor-pointer">
                    Velocity Mapping
                  </Label>
                  <Button
                    id="velocity-toggle"
                    variant={velocityEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleVelocityToggle(!velocityEnabled)}
                    disabled={!wsConnected}
                    className={`h-6 px-2 text-xs ${
                      velocityEnabled
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800"
                    }`}
                  >
                    {velocityEnabled ? "ON" : "OFF"}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="midi-output-toggle" className="text-gray-300 text-sm cursor-pointer">
                    Use MIDI Output
                  </Label>
                  <Button
                    id="midi-output-toggle"
                    variant={useMidiOutput ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleMidiOutputToggle(!useMidiOutput)}
                    disabled={!wsConnected}
                    className={`h-6 px-2 text-xs ${
                      useMidiOutput
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800"
                    }`}
                  >
                    {useMidiOutput ? "ON" : "OFF"}
                  </Button>
                </div>

                {availableMidiDevices.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-gray-300 text-xs">MIDI Device</Label>
                    <Select value={selectedMidiDevice} onValueChange={setSelectedMidiDevice}>
                      <SelectTrigger className="h-8 text-xs border-gray-600 bg-gray-700 text-white">
                        <SelectValue placeholder="Default device" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={fetchAvailableMidiDevices}
                          className="w-full text-xs text-gray-300 hover:bg-gray-600 mb-1"
                        >
                          🔄 Refresh Devices
                        </Button>
                        <SelectItem value="" className="text-xs text-white">
                          Default Device
                        </SelectItem>
                        {availableMidiDevices.map((device, index) => (
                          <SelectItem key={index} value={device} className="text-xs text-white">
                            {device}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {windowTargetingSupported && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="window-targeting-toggle" className="text-gray-300 text-sm cursor-pointer">
                        Play in Focused Window
                      </Label>
                      <Button
                        id="window-targeting-toggle"
                        variant={windowTargetingEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleWindowTargetingToggle(!windowTargetingEnabled)}
                        disabled={!wsConnected || !selectedWindow}
                        className={`h-6 px-2 text-xs ${
                          windowTargetingEnabled
                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                            : "border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800"
                        }`}
                      >
                        {windowTargetingEnabled ? "ON" : "OFF"}
                      </Button>
                    </div>

                    {availableWindows.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-gray-300 text-xs">Target Window</Label>
                        <Select value={selectedWindow} onValueChange={setSelectedWindow}>
                          <SelectTrigger className="h-8 text-xs border-gray-600 bg-gray-700 text-white">
                            <SelectValue placeholder="Select window..." />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={fetchAvailableWindows}
                              className="w-full text-xs text-gray-300 hover:bg-gray-600 mb-1"
                            >
                              🔄 Refresh Windows
                            </Button>
                            {availableWindows.map((window, index) => (
                              <SelectItem key={index} value={window.title} className="text-xs text-white">
                                {window.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-7 space-y-3 flex flex-col">
          <Card className="border-gray-700 shadow-lg bg-gray-800 flex-1">
            <CardContent className="p-4 h-full flex items-center justify-center">
              <div className="text-center w-full">
                <div className="text-4xl font-mono font-bold text-white bg-gray-900 rounded-lg p-6 border-2 border-gray-600 min-h-[120px] flex items-center justify-center shadow-inner">
                  {currentNote || "—"}
                </div>
                <p className="text-gray-300 mt-2 text-sm">Active Note → Key</p>

                <div className="mt-3">
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                      isPlaying
                        ? "bg-green-900 text-green-300 border border-green-700"
                        : "bg-gray-700 text-gray-300 border border-gray-600"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${isPlaying ? "bg-green-400 animate-pulse" : "bg-gray-500"}`}
                    />
                    {isPlaying ? "Playing" : "Stopped"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-700 shadow-lg bg-gray-800">
            <CardHeader className="bg-gray-750 border-b border-gray-700 py-2">
              <CardTitle className="text-white text-sm flex items-center justify-between">
                Keyboard Bindings {globalKeyboardEnabled && <span className="text-blue-400 text-xs">(Global)</span>}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setKeyBindingMode(!keyBindingMode)}
                  className="text-gray-300 hover:text-white h-6 px-2"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {keyBindingMode ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 mb-3">Click a button then press a key to rebind</p>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {Object.entries(customBindings).map(([action, key]) => (
                      <div key={action} className="flex justify-between items-center">
                        <span className="text-gray-300 capitalize">{action.replace(/([A-Z])/g, " $1")}:</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleKeyBinding(action)}
                          className={`h-6 px-2 text-xs border-gray-600 ${
                            waitingForKey === action
                              ? "bg-blue-600 text-white animate-pulse"
                              : "text-gray-200 hover:bg-gray-700 bg-gray-800"
                          }`}
                        >
                          {waitingForKey === action ? "Press key..." : key}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setKeyBindingMode(false)}
                    className="w-full mt-3 text-xs border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {globalKeyboardEnabled && (
                    <div className="text-xs text-blue-400 bg-blue-900/20 p-2 rounded border border-blue-800 mb-3">
                      ⌨️ Global keyboard controls are active! These shortcuts work even when the app isn't focused.
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="font-semibold">Play:</span>
                        <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-200 font-mono border border-gray-600">
                          {customBindings.play.replace("Key", "").replace("F", "F")}
                        </kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Pause:</span>
                        <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-200 font-mono border border-gray-600">
                          {customBindings.pause.replace("Key", "").replace("F", "F")}
                        </kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Stop:</span>
                        <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-200 font-mono border border-gray-600">
                          {customBindings.stop.replace("Key", "").replace("F", "F")}
                        </kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Slow Down:</span>
                        <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-200 font-mono border border-gray-600">
                          {customBindings.slowDown.replace("Key", "").replace("F", "F")}
                        </kbd>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="font-semibold">Speed Up:</span>
                        <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-200 font-mono border border-gray-600">
                          {customBindings.speedUp.replace("Key", "").replace("F", "F")}
                        </kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Toggle Sustain:</span>
                        <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-200 font-mono border border-gray-600">
                          {customBindings.toggleSustain.replace("Key", "").replace("F", "F")}
                        </kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Toggle Velocity:</span>
                        <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-200 font-mono border border-gray-600">
                          {customBindings.toggleVelocity.replace("Key", "").replace("F", "F")}
                        </kbd>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-700 shadow-lg bg-gray-800">
            <CardHeader
              className="bg-gray-750 border-b border-gray-700 py-2 cursor-pointer"
              onClick={() => setDebugMenuOpen(!debugMenuOpen)}
            >
              <CardTitle className="text-white text-sm flex items-center justify-between">
                Debug Info
                {debugMenuOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
            {debugMenuOpen && (
              <CardContent className="p-3">
                {midiInfo && !midiInfo.error ? (
                  <div className="text-xs text-gray-300 space-y-1">
                    <div className="grid grid-cols-2 gap-2">
                      <span>Duration: {midiInfo.duration}s</span>
                      <span>Tracks: {midiInfo.tracks}</span>
                      <span>
                        Range: {midiInfo.note_range?.min} - {midiInfo.note_range?.max}
                      </span>
                      <span>Messages: {midiInfo.messages}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-700">
                      <span className="font-semibold">WebSocket Status: </span>
                      <span className={wsConnected ? "text-green-400" : "text-red-400"}>
                        {wsConnected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No MIDI file loaded</p>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
