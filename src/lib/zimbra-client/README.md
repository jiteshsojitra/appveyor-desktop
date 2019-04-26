# Steps to add and use new API functionality with graphql
To add new API functionality, you need to:
1. Add the api call to our api javascript library
2. If it is a query, add the api call to our batch api library (TBD if we should do it for mutations as well)
3. Update our graphql schema with the query/mutation that your api represents, and update the schema appropriately to handle the request and response data structures
4. Make your new schema definitions executable by tying the query/mutation schema definitions to their implementing API calls
5. Define reusable graphql query/mutation documents
6. Use the query/mutation documents in your components

For the purpose of an example, we'll pretend we are adding the ability to read a Task from the api.

## 1. Add the api call to our api javascript library
The javascript library is located at [./index.js](./index.js)

The api is structured by area, e.g. `folders`, `tasks`, etc.  Either add your function to a logical existing area or add a new one if warranted.  You should normalize/denormalize the request/response using the schema located in [./schema.js](./schema.js) so that the field names are more developer friendly (e.g. `folderId` instead of `l`, which is what the native zimbra API calls the folderId field).

For our example of adding the ability to read a task by id, we would add to the existing `tasks` block and put in a `read` function that looks like 
```
read: (id) =>
			api.jsonRequest('GetTaskRequest', { id})
			.then(task => normalize(task, CalendarItem), 
```

## 2. If it is a query, add the api call to our batch api library

Since graphql could potentially fetch multiple queries at a given time to fulfill a document request, we like to batch those.  The batch api library is located at [./zimbra-batch-api.js](./zimbra-batch-api.js).  It technically is redundant to `zimbra-api` in that we end up definining the same operation here as in `zimbra-api`.  We will eventually consolidate it so that `zimbra-api` auto-batches stuff or use `zimbra-batch-api` instead of `zimbra-api` entirely.  Either way, you need to redefine your api call and normalization steps here, and export it as a function at the end of the file.  Look at all of the other functions for examples

For our example, it would look like 
```
const task = ({ id }) => ({
	name: 'GetTaskRequest',
	options: {id },
	normalizeResponse: ({ task }) => normalize(task, CalendarItem)
});

//bind it to batch loader 
const loadTask = flow([task, batchLoaderLoad]);

//export it
return {
	...,
	loadTask
};
```

# 3 Update our graphql schema 
To work with graphql, we need a schema that defines queries and mutations we can make, and the data structures for the request and responses of those queries/mutations.  Our graphql schema is located in [../../graphql/schema.graphql](../../graphql/schema.graphql)

Start by adding the query/mutation to the `type Query {` or `type Mutation {` blocks that your api represents, and then build out any `type`s, `enum`s, etc. that are necessary to create the request/response data for your query/mutation that don't already exist.

For full details on graphql schema definitions, see [graphql.org](http://graphql.org/learn/schema/)

For our example, assuming the `CalendarItem` definition already exists in the schema, we would add a new query called `task` that takes in a required variable called `id` of built-in type [ID](http://graphql.org/learn/schema/#scalar-types) and returns our internally defined type of `CalendarItem`

```
type Query {
	... # other queries
	task(id: ID!): CalendarItem  #our new query takes a required argument called "id" of type ID and returns a CalendarItem
```

# 4 Make your new schema queries/mutations executable
The types/queries/mutations you created in step 3 are just descriptions/definitions.  They are not runnable yet.  We need to tell the libary how to actually get results/make something happen when someone runs a query/mutation. To do that, update [../../graphql/schema.js](../../graphql/schema.js).  

You need to add an entry in the `Query` resolvers for your new query or in the `Mutation` resolvers for mutations.  For queries, use the batch-api call that you built out in step 2.  For mutations we typically call the zimbra-api client directly.

For our example, we would modify the `Query` resolvers to call our new batch-api method.  Read the [graphql-tools](https://www.apollographql.com/docs/graphql-tools/resolvers.html#Resolver-function-signature) documentation on the resolver function signature for full details, but in this case we only use the second argument which are the arguments passed to the function as defined in the query we created earlier

```
resolvers: {
	Query: {
		..., //other query resolvers
		task: (_, { ids }) => api.loadTask({id}), 

```


# 5 Define reusable graphql query/mutation documents
You now have an executable schema and you could make a full graphql request in a component.  If you specified a graphql request graph in your document it would get "compiled" client side, which adds unnecessary time.  If we have a known predefined request (which we almost always do), then we can define that in a `.graphql` file to be imported pre-compiled by our components thanks to the [graphql-tag/loader](https://github.com/apollographql/graphql-tag#webpack-preprocessing-with-graphql-tagloader) used by our webpack configuration.  We store our `.graphql` files in the [../../graphql/queries](../../graphql/queries) directory.

Again, see [graphql.org](http://graphql.org/learn/queries/) for descriptions of Query and Mutation syntax.  

Note: If you only have one query or mutation defined in a `.graphql` file, it will be the default export when you import that in your component.  If you have more than 1 query or mutation defined in a file, they will each be named exports.

For our example, we want to define a document that exposes a query that takes in an `id` variable, runs our predefined `task` query that we defined in steps 3 and 4, and returns some of the fields off of `CalendarItem`, like `id`, `name`, etc.

It would look something like this in a file called [../../graphql/queries/tasks.graphql](../../graphql/queries/tasks.graphql)
```
query TaskQuery($id: ID!) {
    task(id: $id) {
		id
		name
		instances {
			dueDate
			timezoneDue
		}
		# other fields I might want
    }
}
```

# 6 Use the query/mutation documents in your components
Now that we a reusable query setup, we can use the [graphql decorator](https://www.apollographql.com/docs/react/basics/setup.html#graphql) from [react-apollo](https://www.apollographql.com/docs/react/) tell our component to use it to run the query and provide the results as props to our component

You can read all about the configuration of [Queries](https://www.apollographql.com/docs/react/basics/queries.html) and [Mutations](https://www.apollographql.com/docs/react/basics/mutations.html).

For our example, let's say we want to implement a `<Task id="1234">` component to render something based on the data of task with id 1234.  Our component would look something like:

```
import { graphql } from 'react-apollo'
import TaskQuery from '../../graphql/queries/tasks.graphql';

@graphql(TaskQuery, {

	//don't run the query if id is not provided
	skip: props => !props.id,   

	//use options to tell the query about variables to pass to the query
	options: (props) => ({
		variables: {
			id: props.id
		}
	})

	// the default prop passed down is called data and holds the result of your tree
	// we can transform that into what we want to pass down as props, which in this case is
	// the task, the loading state, and any error info with the fetch
	props: ({ data: { loading, error, task } }) => ({   
		loading,
		error,
		task
	})
})
export default function Task extends Component {

	render({id, task, loading, error}) {
		
		//use loading to handle loading view
		//use error to handle error states
		//use task to show the information
	}
}

```
