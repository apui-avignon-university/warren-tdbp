import { useQuery } from "@tanstack/react-query";
import { AxiosInstance } from "axios";
import { apiAxios } from "../../libs/axios";
import useTokenInterceptor from "../../hooks/useTokenInterceptor";

export const DEFAULT_BASE_QUERY_KEY = "slidingWindow";

export enum Ressources {
  BOOK = "\\mod_book\\event\\chapter_viewed",
  CHAT = "\mod_chat\event\course_module_viewed",
  DATABASE = "\\mod_data\\event\\course_module_viewed",
  FOLDER = "\\mod_folder\\event\\course_module_viewed",
  FORUM = "\\mod_forum\\event\\discussion_viewed",
  GLOSSARY = "\\mod_glossary\\event\\course_module_viewed",
  IMS_CONTENT_PACKAGE = "\\mod_imscp\\event\\course_module_viewed",
  EXTERNAL_TOOL = "\\mod_lti\\event\\course_module_viewed",
  PAGE = "\\mod_page\\event\\course_module_viewed",
  URL = "\\mod_url\\event\\course_module_viewed",
  WIKI = "\\mod_wiki\\event\\course_module_viewed"
};

export enum Activities {
  ASSIGNMENT_SUBMITTED = "\\mod_assign\\event\\assessable_submitted",
  ASSIGNMENT_GRADED = "\\mod_assign\\event\\submission_graded",
  FEEDBACK = "\\mod_feedback\\event\\response_submitted",
  FORUM_DISCUSSION_CREATED = "\\mod_forum\\event\\discussion_created",
  FORUM_POST_CREATED = "\\mod_forum\\event\\post_created",
  TEST = "\\mod_quiz\\event\\attempt_submitted",
  SCORM_PACKAGE_LAUNCHED = "\mod_scorm\event\sco_launched",
  SCORM_PACKAGE_RAW_SUBMITTED = "\mod_scorm\event\scoreraw_submitted",
  SCORM_PACKAGE_STATUS_SUBMITTED = "\mod_scorm\event\status_submitted"
};

export type Action = {
  iri: string;
  title: string;
  module_type: Activities | Ressources;
  activation_date: string;
  activation_students: Array<string>;
  activation_rate: number;
};

type Window = {
  since: string;
  until: string;
};

type SlidingWindowResponse = {
  window: Window;
  active_actions: Array<Action>;
  dynamic_cohort: Array<string>;
};

type SlidingWindowQueryParams = {
  courseId: string;
  until: string;
};

const getSlidingWindow = async (
  client: AxiosInstance,
  queryParams: SlidingWindowQueryParams,
): Promise<SlidingWindowResponse> => {
  const response = await client.get(`tdbp/window`, {
    params: queryParams,
  });
  return response?.data;
};

type UseSlidingWindowReturn = {
  slidingWindow: SlidingWindowResponse | undefined;
  isFetching: boolean;
};

export const useSlidingWindow = (
  queryParams: SlidingWindowQueryParams,
): UseSlidingWindowReturn => {
  // Get the API client, set with the authorization headers and refresh mechanism
  const client = useTokenInterceptor(apiAxios);

  const { courseId, until } = queryParams;
  const queryResult = useQuery({
    queryKey: [DEFAULT_BASE_QUERY_KEY, courseId, until],
    queryFn: () => getSlidingWindow(client, queryParams),
    staleTime: Infinity,
  });

  const { isFetching, data } = queryResult;

  return {
    slidingWindow: data,
    isFetching,
  };
};
