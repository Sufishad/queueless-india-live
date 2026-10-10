import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;

enum SocketConnectionState { connecting, connected, reconnecting, disconnected }

enum SocketEventType { queueUpdate, tokenCalled, tokenStatus, queuePaused, queueResumed }

class SocketEvent {
  final SocketEventType type;
  final Map<String, dynamic> data;

  const SocketEvent({required this.type, required this.data});
}

class SocketService {
  io.Socket? _socket;
  final String serverUrl;

  final _connectionStateController =
      StreamController<SocketConnectionState>.broadcast();
  final _eventsController = StreamController<SocketEvent>.broadcast();
  final _queueUpdateController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _tokenCalledController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _tokenStatusController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _queuePausedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _queueResumedController =
      StreamController<Map<String, dynamic>>.broadcast();

  bool get isConnected => _socket?.connected ?? false;
  Stream<SocketEvent> get events => _eventsController.stream;
  Stream<SocketConnectionState> get connectionStateStream =>
      _connectionStateController.stream;
  Stream<Map<String, dynamic>> get queueUpdateStream =>
      _queueUpdateController.stream;
  Stream<Map<String, dynamic>> get tokenCalledStream =>
      _tokenCalledController.stream;
  Stream<Map<String, dynamic>> get tokenStatusStream =>
      _tokenStatusController.stream;
  Stream<Map<String, dynamic>> get queuePausedStream =>
      _queuePausedController.stream;
  Stream<Map<String, dynamic>> get queueResumedStream =>
      _queueResumedController.stream;

  SocketService({
    this.serverUrl = const String.fromEnvironment(
      'SOCKET_SERVER_URL',
      defaultValue: 'https://queueless-india-live.onrender.com',
    ),
  });

  void connect() {
    if (_socket != null && _socket!.connected) return;

    _connectionStateController.add(SocketConnectionState.connecting);

    _socket = io.io(
      serverUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionDelay(1000)
          .setReconnectionDelayMax(5000)
          .build(),
    );

    _socket!.onConnect((_) {
      _connectionStateController.add(SocketConnectionState.connected);
    });

    _socket!.onReconnectAttempt((_) {
      _connectionStateController.add(SocketConnectionState.reconnecting);
    });

    _socket!.onDisconnect((_) {
      _connectionStateController.add(SocketConnectionState.disconnected);
    });

    // Event listeners mapped to server events
    _socket!.on('queue:update', (data) {
      if (data is Map<String, dynamic>) {
        _queueUpdateController.add(data);
        _eventsController.add(SocketEvent(type: SocketEventType.queueUpdate, data: data));
      }
    });

    _socket!.on('token:called', (data) {
      if (data is Map<String, dynamic>) {
        _tokenCalledController.add(data);
        _eventsController.add(SocketEvent(type: SocketEventType.tokenCalled, data: data));
      }
    });

    _socket!.on('token:status', (data) {
      if (data is Map<String, dynamic>) {
        _tokenStatusController.add(data);
        _eventsController.add(SocketEvent(type: SocketEventType.tokenStatus, data: data));
      }
    });

    _socket!.on('queue:paused', (data) {
      if (data is Map<String, dynamic>) {
        _queuePausedController.add(data);
        _eventsController.add(SocketEvent(type: SocketEventType.queuePaused, data: data));
      }
    });

    _socket!.on('queue:resumed', (data) {
      if (data is Map<String, dynamic>) {
        _queueResumedController.add(data);
        _eventsController.add(SocketEvent(type: SocketEventType.queueResumed, data: data));
      }
    });
  }

  void subscribeBranch(String branchId) {
    _socket?.emit('branch:subscribe', {'branchId': branchId});
  }

  void subscribeToBranch(String branchId) => subscribeBranch(branchId);

  void unsubscribeBranch(String branchId) {
    _socket?.emit('branch:unsubscribe', {'branchId': branchId});
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _connectionStateController.add(SocketConnectionState.disconnected);
  }

  void dispose() {
    disconnect();
    _connectionStateController.close();
    _queueUpdateController.close();
    _tokenCalledController.close();
    _tokenStatusController.close();
    _queuePausedController.close();
    _queueResumedController.close();
  }
}
