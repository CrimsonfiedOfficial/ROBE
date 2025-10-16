import mido
import asyncio
import keyboard as kb
import threading
from queue import Queue
from typing import Dict, Optional, Callable
import inspect
import pygetwindow as gw


class MidiProcessor:

    def __init__(self, config_manager=None):
        self.is_playing = False
        self.is_paused = False
        self.paused_position = 0.0
        self.note_callback: Optional[Callable] = None
        self.config_manager = config_manager

        self.current_position = 0.0
        self.total_duration = 0.0
        self.seek_position = None
        self.tempo_scale = 100.0
        self.tempo_changed = False

        self.use_midi_output = config_manager.get("use_midi_output", False) if config_manager else False
        self.midi_device = None
        self.midi_out = None
        
        self.main_sequence = "1!2@34$5%6^78*9(0qQwWeErtTyYuiIoOpPasSdDfgGhHjJklLzZxcCvVbBnm"
        self.low_notes = "1234567890qwert"
        self.high_notes = "yuiopasdfghj"
        self.velocity_map = "1234567890qwertyuiopasdfghjklzxc"

        self.main_start_note = 36
        self.main_end_note = self.main_start_note + len(self.main_sequence) - 1

        self.sustain_enabled = False
        self.velocity_enabled = False
        self.no_doubles = True
        self.hold_keys = False
        
        self.sustain_pressed = False

        self.active_notes: Dict[int, tuple[str, list]] = {}

        self.event_queue = Queue()
        self.worker_thread = threading.Thread(target=self._keyboard_worker, daemon=True)
        self.worker_thread.start()

        self.target_window = None
        self.window_targeting_enabled = False

    def _keyboard_worker(self):
        while True:
            action, key = self.event_queue.get()
            try:
                if self.window_targeting_enabled and self.target_window:
                    pass
            except Exception as e:
                print(f"Could not target window '{self.target_window}': {e}")
            
            try:
                if action == "press":
                    kb.press(key)
                elif action == "release":
                    kb.release(key)
            except Exception as e:
                print(f"Keyboard error on {action} {key}: {e}")
            self.event_queue.task_done()

    def set_use_midi_output(self, enabled: bool, midi_device: Optional[str] = None):
        self.use_midi_output = enabled
        self.midi_device = midi_device
        
        if self.config_manager:
            self.config_manager.set("use_midi_output", enabled)
            self.config_manager.set("midi_device", midi_device)
        
        if self.midi_out:
            try:
                self.midi_out.close()
                self.midi_out = None
                print("Closed MIDI output port")
            except Exception as e:
                print(f"Error closing MIDI port: {e}")
        
        print(f"MIDI output {'enabled' if enabled else 'disabled'}")
        if enabled and midi_device:
            print(f"MIDI device: {midi_device}")

    def _open_midi_output(self):
        if self.midi_out:
            return True
            
        try:
            if self.midi_device:
                self.midi_out = mido.open_output(self.midi_device)
                print(f"Opened MIDI output: {self.midi_device}")
            else:
                self.midi_out = mido.open_output()
                print("Opened default MIDI output")
            return True
        except Exception as e:
            print(f"Failed to open MIDI output: {e}")
            return False

    def _close_midi_output(self):
        if self.midi_out:
            try:
                self.midi_out.close()
                self.midi_out = None
                print("Closed MIDI output port")
            except Exception as e:
                print(f"Error closing MIDI port: {e}")

    def _send_midi_message(self, msg):
        if self.use_midi_output and self.midi_out:
            try:
                self.midi_out.send(msg)
            except Exception as e:
                print(f"Error sending MIDI message: {e}")

    def midi_note_to_name(self, note_number: int) -> str:
        note_names = ['C', 'C#', 'D', 'D#', 'E', 'F',
                      'F#', 'G', 'G#', 'A', 'A#', 'B']
        octave = (note_number // 12) - 1
        return f"{note_names[note_number % 12]}{octave}"

    def get_key_for_note(self, note_number: int) -> tuple[Optional[str], list]:
        modifiers = []

        if self.main_start_note <= note_number <= self.main_end_note:
            index = note_number - self.main_start_note
            key_char = self.main_sequence[index]
            if key_char.isupper() or key_char in "!@$%^*()":
                modifiers.append("shift")
                shift_map = {
                    '!': '1', '@': '2', '$': '4', '%': '5',
                    '^': '6', '*': '8', '(': '9', ')': '0'
                }
                key_char = shift_map.get(key_char, key_char.lower())
        elif note_number < self.main_start_note:
            offset = self.main_start_note - note_number - 1
            if offset < len(self.low_notes):
                key_char = self.low_notes[offset]
                modifiers.append("ctrl")
            else:
                return None, []
        else:
            offset = note_number - self.main_end_note - 1
            if offset < len(self.high_notes):
                key_char = self.high_notes[offset]
                modifiers.append("ctrl")
            else:
                return None, []
        return key_char, modifiers

    def get_velocity_key(self, velocity: int) -> Optional[str]:
        if not self.velocity_enabled or velocity == 0:
            return None
        velocity_index = min(velocity // 4, len(self.velocity_map) - 1)
        return self.velocity_map[velocity_index]

    def set_note_callback(self, callback: Optional[Callable]):
        self.note_callback = callback

    async def _maybe_call_note_callback(self, payload: dict):
        if not self.note_callback:
            return
        try:
            if inspect.iscoroutinefunction(self.note_callback):
                await self.note_callback(payload)
            else:
                self.note_callback(payload)
        except Exception as e:
            print(f"Note callback error: {e}")

    def press_note(self, note_number: int, key_char: str, modifiers: list, velocity_key: Optional[str] = None):
        if self.no_doubles:
            for n, (k, mods) in list(self.active_notes.items()):
                if k == key_char:
                    self._enqueue_release(k)
                    for m in reversed(mods):
                        self._enqueue_release(m)
                    del self.active_notes[n]

        for mod in modifiers:
            self._enqueue_press(mod)

        if velocity_key:
            self._enqueue_press("alt")
            self._enqueue_press(velocity_key)
            self._enqueue_release(velocity_key)
            self._enqueue_release("alt")

        self._enqueue_press(key_char)

        if not self.hold_keys:
            self._enqueue_release(key_char)
            for mod in reversed(modifiers):
                self._enqueue_release(mod)
        else:
            self.active_notes[note_number] = (key_char, modifiers)

    def release_note(self, note_number: int):
        if note_number in self.active_notes:
            key_char, modifiers = self.active_notes[note_number]
            self._enqueue_release(key_char)
            for mod in reversed(modifiers):
                self._enqueue_release(mod)
            del self.active_notes[note_number]

    def handle_sustain_pedal(self, pressed: bool):
        if not self.sustain_enabled:
            return
        if pressed != self.sustain_pressed:
            if pressed:
                self._enqueue_press("space")
            else:
                self._enqueue_release("space")
            self.sustain_pressed = pressed

    async def play_midi_file(self, file_path: str, tempo_scale: float = 100.0):
        try:
            mid = mido.MidiFile(file_path)
            self.is_playing = True
            self.is_paused = False
            self.active_notes.clear()
            self.sustain_pressed = False
            self.tempo_scale = tempo_scale
            
            if self.use_midi_output:
                if not self._open_midi_output():
                    print("Failed to open MIDI output, falling back to keyboard mode")
                    self.use_midi_output = False
            
            self.total_duration = mid.length
            
            if self.seek_position is not None:
                self.current_position = max(0.0, min(self.seek_position, self.total_duration))
                seek_target = self.current_position
                self.seek_position = None
                print(f"Seeking to {seek_target:.2f}s")
            elif self.is_paused and self.paused_position > 0:
                self.current_position = self.paused_position
                seek_target = self.paused_position
                self.paused_position = 0.0
                print(f"Resuming from {seek_target:.2f}s")
            else:
                self.current_position = 0.0
                seek_target = 0.0

            mode_str = "MIDI output" if self.use_midi_output else "keyboard simulation"
            print(f"Playing {file_path} at {tempo_scale}% speed from {seek_target:.2f}s using {mode_str}")

            timed_events = []
            current_time = 0.0
            
            for msg in mid:
                current_time += msg.time
                if msg.type in ["note_on", "note_off", "control_change"]:
                    timed_events.append((current_time, msg))

            filtered_events = [(t, msg) for t, msg in timed_events if t >= seek_target]
            
            loop_start_time = asyncio.get_event_loop().time()
            playback_start_time = seek_target
            last_position_update = seek_target
            current_tempo = tempo_scale
            
            for event_time, msg in filtered_events:
                if not self.is_playing:
                    break
                
                if self.seek_position is not None:
                    print(f"Seeking during playback to {self.seek_position:.2f}s")
                    for note in list(self.active_notes.keys()):
                        self.release_note(note)
                    if self.sustain_pressed:
                        self.handle_sustain_pedal(False)
                    await self.play_midi_file(file_path, self.tempo_scale)
                    return
                
                if self.tempo_changed:
                    current_real_time = asyncio.get_event_loop().time()
                    elapsed_real_time = current_real_time - loop_start_time
                    elapsed_playback_time = elapsed_real_time * (current_tempo / 100.0)
                    
                    loop_start_time = current_real_time
                    playback_start_time = playback_start_time + elapsed_playback_time
                    current_tempo = self.tempo_scale
                    self.tempo_changed = False
                    print(f"Applied tempo change to {current_tempo}% at position {self.current_position:.2f}s")

                target_playback_time = event_time - playback_start_time
                target_real_time = loop_start_time + (target_playback_time * (100.0 / current_tempo))
                current_real_time = asyncio.get_event_loop().time()
                
                if target_real_time > current_real_time:
                    await asyncio.sleep(target_real_time - current_real_time)
                
                self.current_position = event_time
                
                if self.current_position - last_position_update >= 0.1:
                    await self._maybe_call_note_callback({
                        "type": "position_update",
                        "position": self.current_position,
                        "duration": self.total_duration
                    })
                    last_position_update = self.current_position

                if msg.type == "note_on" and getattr(msg, "velocity", 0) > 0:
                    if self.use_midi_output:
                        self._send_midi_message(msg)
                        
                        await self._maybe_call_note_callback({
                            "type": "current_note",
                            "note": f"{self.midi_note_to_name(msg.note)} → MIDI Out"
                        })
                        print(f"MIDI OUT: {self.midi_note_to_name(msg.note)} ({msg.note}, vel={msg.velocity})")
                    else:
                        key_char, modifiers = self.get_key_for_note(msg.note)
                        if key_char:
                            velocity_key = self.get_velocity_key(getattr(msg, "velocity", 0))
                            self.press_note(msg.note, key_char, modifiers, velocity_key)

                            modifier_str = ""
                            if "ctrl" in modifiers:
                                modifier_str += "Ctrl+"
                            if "shift" in modifiers:
                                modifier_str += "Shift+"
                            if velocity_key and self.velocity_enabled:
                                modifier_str = f"Alt+{velocity_key.upper()}+" + modifier_str
                            display_key = f"{modifier_str}{key_char.upper()}"

                            await self._maybe_call_note_callback({
                                "type": "current_note",
                                "note": f"{self.midi_note_to_name(msg.note)} → {display_key}"
                            })

                            print(f"Note ON: {self.midi_note_to_name(msg.note)} ({msg.note}, vel={msg.velocity}) -> {display_key}")

                elif msg.type == "note_off" or (msg.type == "note_on" and getattr(msg, "velocity", 0) == 0):
                    if self.use_midi_output:
                        self._send_midi_message(msg)
                        print(f"MIDI OUT: {self.midi_note_to_name(msg.note)} ({msg.note}) OFF")
                    else:
                        self.release_note(msg.note)
                        print(f"Note OFF: {self.midi_note_to_name(msg.note)} ({msg.note})")

                elif msg.type == "control_change" and getattr(msg, "control", None) == 64:
                    if self.use_midi_output:
                        self._send_midi_message(msg)
                        sustain_pressed = getattr(msg, "value", 0) >= 64
                        print(f"MIDI OUT: Sustain {'ON' if sustain_pressed else 'OFF'}")
                    else:
                        sustain_pressed = getattr(msg, "value", 0) >= 64
                        self.handle_sustain_pedal(sustain_pressed)
                        print(f"Sustain {'ON' if sustain_pressed else 'OFF'}")

            for note in list(self.active_notes.keys()):
                self.release_note(note)
            if self.sustain_pressed:
                self.handle_sustain_pedal(False)

            await self._maybe_call_note_callback({"type": "current_note", "note": ""})
            await self._maybe_call_note_callback({
                "type": "position_update", 
                "position": self.total_duration,
                "duration": self.total_duration
            })

            if self.use_midi_output:
                self._close_midi_output()

            self.is_playing = False
            print("Playback finished")

        except Exception as e:
            print(f"MIDI playback error: {e}")
            self.is_playing = False
            if self.use_midi_output:
                self._close_midi_output()

    def pause_playback(self):
        if self.is_playing:
            self.is_paused = True
            self.paused_position = self.current_position
            self.is_playing = False
            print(f"Playback paused at {self.current_position:.2f}s")
            
            for note in list(self.active_notes.keys()):
                self.release_note(note)
            if self.sustain_pressed:
                self.handle_sustain_pedal(False)
            
            if self.use_midi_output:
                self._close_midi_output()

    def resume_playback(self, file_path: str):
        if self.is_paused:
            print(f"Resuming playback from {self.paused_position:.2f}s")
            asyncio.create_task(self.play_midi_file(file_path, self.tempo_scale))

    def stop_playback(self):
        self.is_playing = False
        self.is_paused = False
        self.paused_position = 0.0
        self.current_position = 0.0
        for note in list(self.active_notes.keys()):
            self.release_note(note)
        if self.sustain_pressed:
            self.handle_sustain_pedal(False)
        
        if self.use_midi_output:
            self._close_midi_output()
            
        if self.note_callback:
            try:
                if inspect.iscoroutinefunction(self.note_callback):
                    asyncio.create_task(self.note_callback({"type": "current_note", "note": ""}))
                    asyncio.create_task(self.note_callback({
                        "type": "position_update",
                        "position": 0.0,
                        "duration": self.total_duration
                    }))
                else:
                    self.note_callback({"type": "current_note", "note": ""})
                    self.note_callback({
                        "type": "position_update",
                        "position": 0.0,
                        "duration": self.total_duration
                    })
            except Exception:
                pass
        print("Playback stopped")

    def set_sustain_enabled(self, enabled: bool):
        self.sustain_enabled = enabled
        if self.config_manager:
            self.config_manager.set("sustain_enabled", enabled)
        print(f"Sustain {'enabled' if enabled else 'disabled'}")

    def set_velocity_enabled(self, enabled: bool):
        self.velocity_enabled = enabled
        if self.config_manager:
            self.config_manager.set("velocity_enabled", enabled)
        print(f"Velocity mapping {'enabled' if enabled else 'disabled'}")

    def set_no_doubles(self, enabled: bool):
        self.no_doubles = enabled
        if self.config_manager:
            self.config_manager.set("no_doubles", enabled)

    def set_hold_keys(self, enabled: bool):
        self.hold_keys = enabled
        if self.config_manager:
            self.config_manager.set("hold_keys", enabled)

    def set_target_window(self, window_title: Optional[str] = None):
        self.target_window = window_title
        self.window_targeting_enabled = window_title is not None
        if self.config_manager:
            self.config_manager.set("window_targeting_enabled", self.window_targeting_enabled)
            self.config_manager.set("target_window", window_title)
        print(f"Window targeting {'enabled' if self.window_targeting_enabled else 'disabled'}")
        if window_title:
            print(f"Target window: {window_title}")

    def update_tempo(self, new_tempo: float):
        if self.is_playing:
            self.tempo_scale = new_tempo
            self.tempo_changed = True
            print(f"Tempo updated to {new_tempo}% during playback")
        else:
            self.tempo_scale = new_tempo
            print(f"Tempo set to {new_tempo}% for next playback")

    def _enqueue_press(self, key: str):
        self.event_queue.put(("press", key))

    def _enqueue_release(self, key: str):
        self.event_queue.put(("release", key))
