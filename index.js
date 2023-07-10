const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

const app = express();

// Set up routes

// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    res.status(200).json({ message: 'File uploaded successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred during file upload' });
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});

// Load protobuf
const packageDefinition = protoLoader.loadSync('file.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const fileProto = grpc.loadPackageDefinition(packageDefinition).file;

// Implement the gRPC service
const uploadFile = (call, callback) => {
  try {
    const { name, type, data } = call.request;
    fs.writeFileSync(`uploads/${name}`, data);

    callback(null, { message: 'File uploaded successfully' });
  } catch (error) {
    console.error(error);
    callback({
      code: grpc.status.INTERNAL,
      message: 'An error occurred during file upload',
    });
  }
};

// Start the gRPC server
const grpcServer = new grpc.Server();
grpcServer.addService(fileProto.FileService.service, { uploadFile });
grpcServer.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  grpcServer.start();
  console.log('gRPC server is listening on port 50051');
});
