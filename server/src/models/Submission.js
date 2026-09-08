import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    userEmail: {
      type: String,
      default: ''
    },
    userName: {
      type: String,
      default: ''
    },
    projectTitle: {
      type: String,
      required: true
    },
    repoUrl: {
      type: String,
      required: true,
      trim: true
    },
    branch: {
      type: String,
      default: 'main'
    },
    notes: {
      type: String,
      default: ''
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    score: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['passed', 'review', 'failed'],
      default: 'review'
    },
    evaluation: {
      score: { type: Number, default: 0 },
      maxScore: { type: Number, default: 100 },
      summary: { type: String, default: '' },
      criteriaBreakdown: [
        {
          name: { type: String },
          score: { type: Number },
          maxScore: { type: Number },
          feedback: { type: String }
        }
      ],
      completed: [String],
      missing: [String],
      issues: [
        {
          title: { type: String },
          location: { type: String },
          severity: { type: String, enum: ['critical', 'warning', 'info'], default: 'info' },
          suggestion: { type: String }
        }
      ],
      scrapedFiles: [
        {
          path: { type: String },
          lineCount: { type: Number },
          size: { type: Number },
          sizeBytes: { type: Number },
          content: { type: String }
        }
      ]
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for high-speed dashboard, project drawer, and user submission queries
submissionSchema.index({ userId: 1, submittedAt: -1 });
submissionSchema.index({ projectId: 1, submittedAt: -1 });
submissionSchema.index({ submittedAt: -1 });

submissionSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    return ret;
  }
});

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
