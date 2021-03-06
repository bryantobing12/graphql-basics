import uuidv4 from 'uuid/v4'

const Mutation = {
  createUser(parent, args, { db: { users } }, info) {
    const emailTaken = users.some((user) => user.email === args.data.email)

    if (emailTaken) {
      throw new Error('Email taken.')
    }

    const user = {
      id: uuidv4(),
      ...args.data,
    }

    users.push(user)

    return user
  },
  deleteUser(parent, args, { db: { users, posts, comments } }, info) {
    const userIndex = users.findIndex((user) => user.id === args.id)

    if (userIndex === -1) {
      throw new Error('User not found')
    }

    const deletedUsers = users.splice(userIndex, 1)

    posts = posts.filter((post) => {
      const match = post.authorId === args.id

      if (match) {
        comments = comments.filter((comment) => comment.postId !== post.id)
      }

      return !match
    })

    comments = comments.filter((comment) => comment.authorId !== args.id)

    return deletedUsers[0]
  },
  updateUser(parent, args, { db: { users } }, info) {
    const { id, data } = args
    const user = users.find((user) => user.id === args.id)

    if (!user) {
      throw new Error('User not found')
    }

    if (typeof data.email === 'string') {
      const emailTaken = users.some((user) => user.email === data.email)

      if (emailTaken) {
        throw new Error('Email taken')
      }

      user.email = data.email
    }

    if (typeof data.name === 'string') {
      user.name = data.name
    }

    if (typeof data.age !== 'undefined') {
      user.age = data.age
    }

    return user
  },
  createPost(parent, args, { db: { users, posts }, pubSub }, info) {
    const userExists = users.some((user) => user.id === args.data.author)

    if (!userExists) {
      throw new Error('User not found')
    }

    const post = {
      id: uuidv4(),
      ...args.data,
      authorId: args.data.author,
    }

    posts.push(post)

    if (post.published) {
      pubSub.publish('POST', {
        post: {
          mutation: 'CREATED',
          data: post,
        },
      })
    }

    return post
  },
  deletePost(parent, args, { db: { posts, comments }, pubSub }, info) {
    const postIndex = posts.findIndex((post) => post.id === args.id)

    if (postIndex === -1) {
      throw new Error('No post exist')
    }
    // Delete the post
    const [deletedPost] = posts.splice(postIndex, 1)

    comments = comments.filter((comment) => comment.postId !== args.id)

    if (deletedPost.published) {
      pubSub.publish('POST', {
        post: {
          mutation: 'DELETED',
          data: deletedPost,
        },
      })
    }

    return deletedPost
  },
  updatePost(parent, args, { db: { posts }, pubSub }, info) {
    const { id, data } = args
    const post = posts.find((post) => post.id === id)
    const originalPost = { ...post }

    if (!post) {
      throw new Error('No post found')
    }

    if (typeof data.title === 'string') {
      post.title = data.title
    }

    if (typeof data.body === 'string') {
      post.body = data.body
    }

    if (typeof data.published === 'boolean') {
      post.published = data.published

      if (originalPost.published && !post.published) {
        pubSub.publish('POST', {
          post: {
            mutation: 'DELETED',
            data: originalPost,
          },
        })
      } else if (!originalPost.published && post.published) {
        pubSub.publish('POST', {
          post: {
            mutation: 'CREATED',
            data: post,
          },
        })
      }
    } else if (post.published) {
      pubSub.publish('POST', {
        post: {
          mutation: 'UPDATED',
          data: post,
        },
      })
    }

    return post
  },
  createComment(
    parent,
    args,
    { db: { users, posts, comments }, pubSub },
    info
  ) {
    const userExist = users.some((user) => user.id === args.data.author)
    const postExist = posts.some(
      (post) => post.id === args.data.post && post.published
    )

    if (!userExist || !postExist) {
      throw new Error('User or post might not exist')
    }

    const comment = {
      id: uuidv4(),
      ...args.data,
      authorId: args.data.author,
      postId: args.data.post,
    }

    comments.push(comment)

    pubSub.publish(`COMMENT ${args.data.post}`, {
      comment: {
        mutation: 'CREATED',
        data: comment,
      },
    })

    return comment
  },
  deleteComment(parent, args, { db: { comments }, pubSub }, info) {
    const commentIndex = comments.findIndex((comment) => comment.id === args.id)

    if (commentIndex === -1) {
      throw new Error('No comment found')
    }

    // delete comment
    const [deletedComment] = comments.splice(commentIndex, 1)

    pubSub.publish(`COMMENT ${deletedComment.postId}`, {
      comment: {
        mutation: 'DELETED',
        data: deletedComment,
      },
    })

    return deletedComment
  },
  updateComment(parent, args, { db: { comments }, pubSub }, info) {
    const { id, data } = args
    const comment = comments.find((comment) => comment.id === id)

    if (!comment) {
      throw new Error('No comment found')
    }

    if (typeof data.text === 'string') {
      comment.text = data.text
    }

    pubSub.publish(`COMMENT ${comment.postId}`, {
      comment: {
        mutation: 'UPDATED',
        data: comment,
      },
    })

    return comment
  },
}

export { Mutation as default }
