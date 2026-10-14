import { model, Schema, ObjectId } from 'mongoose';

const File = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  accessLink: { type: String },
  size: { type: Number, default: 0 },
  path: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  user: { type: ObjectId, ref: 'User' },
  parent: { type: ObjectId, ref: 'File' },
  childs: [{ type: ObjectId, ref: 'File' }],
});

export default model('File', File);
