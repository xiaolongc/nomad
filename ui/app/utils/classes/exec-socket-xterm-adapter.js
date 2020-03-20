const ANSI_UI_GRAY_400 = '\x1b[38;2;142;150;163m';

import base64js from 'base64-js';
import { TextDecoderLite, TextEncoderLite } from 'text-encoder-lite';

export default class ExecSocketXtermAdapter {
  constructor(terminal, socket) {
    this.terminal = terminal;
    this.socket = socket;

    socket.onopen = () => {
      this.sendTtySize();

      terminal.onData(data => {
        this.handleData(data);
      });
    };

    socket.onmessage = e => {
      let json = JSON.parse(e.data);

      // FIXME what to do with stdout.close or exited, or even {}!
      // stderr messages will not be produced as the socket is opened with the tty flag
      if (json.stdout) {
        terminal.write(decodeString(json.stdout.data));
      }
    };

    socket.onclose = e => {
      this.terminal.writeln('');
      this.terminal.write(ANSI_UI_GRAY_400);
      this.terminal.writeln('The connection has closed.');
      // eslint-disable-next-line
      console.log('Socket close event', e);
      // FIXME interpret different close events
    };

    terminal.resized = () => {
      this.sendTtySize();
    };
  }

  sendTtySize() {
    this.socket.send(
      JSON.stringify({ tty_size: { width: this.terminal.cols, height: this.terminal.rows } })
    );
  }

  handleData(data) {
    this.socket.send(JSON.stringify({ stdin: { data: encodeString(data) } }));
  }
}

function encodeString(string) {
  let encoded = new TextEncoderLite('utf-8').encode(string);
  return base64js.fromByteArray(encoded);
}

function decodeString(b64String) {
  let uint8array = base64js.toByteArray(b64String);
  return new TextDecoderLite('utf-8').decode(uint8array);
}
