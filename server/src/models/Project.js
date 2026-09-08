import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    course: {
      type: String,
      enum: ['MERN', 'JFSD'],
      default: 'MERN'
    },
    requirements: {
      type: [String],
      default: []
    },
    criteria: [
      {
        name: { type: String, required: true },
        maxScore: { type: Number, default: 25 }
      }
    ],
    documentation: {
      rawMarkdown: { type: String, default: '' }
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    strict: false
  }
);

// Map _id to id in JSON output for clean frontend compatibility
projectSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.requirementsCount = ret.requirements?.length || 0;
    ret.evaluationCriteriaCount = ret.criteria?.length || 0;
    if (!ret.category && ret.course) {
      ret.category = ret.course;
    }
    return ret;
  }
});

const Project = mongoose.model('Project', projectSchema);
export default Project;
