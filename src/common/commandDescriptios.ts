export const GENERAL_DESCRIPTION = "Greenhouse is a command-line tool that provides helpers to automate interactions with the Canonical Greenhouse website.";

export const ADD_POSTS_USAGE = "([-i | --interactive] | <job-id> --regions=<region-name>[, <region-name-2>...] [--clone-from=<job-post-id>]) \n\n Examples: \n\t greenhouse add-posts --interactive \n \t greenhouse add-posts 1234 --regions=emea,americas \n \t greenhouse add-posts 1234 --regions=emea --clone-from=1123";

export const ADD_POSTS_DESCRIPTION = "This command creates job posts for a specific job <job-id> in the specified regions <region-name> from all existing job posts in the Canonical Board. If the clone-from is specified, the command will create job posts in the specified regions from that job post. The command can be run interactively with the –interactive flag. This will prompt a set of questions for the user to answer.";

export const ADD_POSTS_REGIONS_DESCRIPTION = "Mandatory argument that is the list of regions where the job posts will be created. The list of regions are: americas, emea, apac, us-boston";

export const JOB_ID_DESCRIPTION = "The job-id is the ID of a job that the user is a Hiring lead of. This ID can be found in the URL of the job page. If the user is not a hiring lead on the specified job, an error message will be thrown. Example: https://canonical.greenhouse.io/sdash/12345 -> The job ID is 12345";

export const CLONE_FROM_DESCRIPTION = "This is an optional argument that is the list of job posts ids that the command will clone from. Each job-post-id specified must come from the Canonical board. If not, the command should fail.";

export const INTERACTIVE_DESCRIPTION = "Activates CLI user-interactive interface. All other arguments will be ignored. The user will go through a series of questions that will have pre-populated answers so the user doesn't have to search for IDs.";

export const DELETE_POSTS_DESCRIPTION = "This command deletes job posts for a specific job <job-id> in the specified regions <region-name> from all existing job posts in the Canonical Board. If the similar flag is specified, the command will delete job posts in the specified regions from that job post. The command can be run interactively with the –interactive flag. This will prompt a set of questions for the user to answer. If no option is given, all job posts in the Canonical - jobs board will be deleted.";

export const DELETE_POSTS_USAGE = "([-i | --interactive] | <job-id> --regions=<region-name>[, <region-name-2>...] [--similar=<job-post-id>]) \n\n Examples: \n\t greenhouse delete-posts --interactive \n\t greenhouse delete-posts 1234 --regions=emea,americas \n\t greenhouse delete-posts 1234 --regions=emea --similar=1123"; 

export const SIMILAR_DESCRIPTION = "This is an optional argument that is the list of job posts ids that the command will delete. Similar job posts will be detected by name. If a job post has a similar name, but a different description, the command will delete ALL job posts with the same name. Each job-post-id specified must come from the Canonical board. If not, the command should fail.";

export const DELETE_POSTS_REGIONS_DESCRIPTION = "Mandatory argument that is the list of regions where the job posts will be deleted. The list of regions are: americas, emea, apac, us-boston"; 
